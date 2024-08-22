import json
import logging
import subprocess
import shlex
from pathlib import Path
from typing import List, Dict, Any
from functools import lru_cache

import diff as asm_differ

from coreapp.platforms import DUMMY, Platform
from coreapp.flags import ASMDIFF_FLAG_PREFIX
from django.conf import settings

from .compiler_wrapper import DiffResult, PATH

from .error import AssemblyError, DiffError, NmError, ObjdumpError
from .models.scratch import Assembly
from .sandbox import Sandbox

logger = logging.getLogger(__name__)

MAX_FUNC_SIZE_LINES = 25000


class DiffWrapper:
    @staticmethod
    def filter_objdump_flags(compiler_flags: str) -> str:
        # Remove irrelevant flags that are part of the base objdump configs, but clutter the compiler settings field.
        # TODO: use cfg for this?
        skip_flags_with_args: set[str] = set()
        skip_flags = {
            "--disassemble",
            "--disassemble-zeroes",
            "--line-numbers",
            "--reloc",
        }

        skip_next = False
        flags = []
        for flag in compiler_flags.split():
            if skip_next:
                skip_next = False
                continue
            if flag in skip_flags:
                continue
            if flag in skip_flags_with_args:
                skip_next = True
                continue
            if any(flag.startswith(f) for f in skip_flags_with_args):
                continue
            flags.append(flag)
        return " ".join(flags)

    @staticmethod
    def create_config(
        arch: asm_differ.ArchSettings, diff_flags: List[str]
    ) -> asm_differ.Config:
        show_rodata_refs = "-DIFFno_show_rodata_refs" not in diff_flags
        algorithm = "difflib" if "-DIFFdifflib" in diff_flags else "levenshtein"
        diff_function_symbols = "-DIFFdiff_function_symbols" in diff_flags

        return asm_differ.Config(
            arch=arch,
            # Build/objdump options
            diff_obj=True,
            file="",
            make=False,
            source_old_binutils=True,
            diff_section=".text",
            inlines=False,
            max_function_size_lines=MAX_FUNC_SIZE_LINES,
            max_function_size_bytes=MAX_FUNC_SIZE_LINES * 4,
            # Display options
            formatter=asm_differ.PythonFormatter(arch_str=arch.name),
            diff_mode=asm_differ.DiffMode.NORMAL,
            base_shift=0,
            skip_lines=0,
            compress=None,
            show_branches=True,
            show_line_numbers=False,
            show_source=False,
            stop_at_ret=False,
            ignore_large_imms=False,
            ignore_addr_diffs=True,
            algorithm=algorithm,
            reg_categories={},
            show_rodata_refs=show_rodata_refs,
            diff_function_symbols=diff_function_symbols,
        )

    @staticmethod
    def get_objdump_target_function_flags(
        sandbox: Sandbox, target_path: Path, platform: Platform, label: str
    ) -> List[str]:
        if not label:
            return ["--start-address=0"]

        if platform.supports_objdump_disassemble:
            return [f"--disassemble={label}"]

        if not platform.nm_cmd:
            raise NmError(f"No nm command for {platform.id}")

        try:
            nm_proc = sandbox.run_subprocess(
                [platform.nm_cmd] + [sandbox.rewrite_path(target_path)],
                shell=True,
                env={
                    "PATH": PATH,
                    "COMPILER_BASE_PATH": sandbox.rewrite_path(
                        settings.COMPILER_BASE_PATH
                    ),
                },
                timeout=settings.OBJDUMP_TIMEOUT_SECONDS,
            )
        except subprocess.TimeoutExpired as e:
            raise NmError("Timeout expired")
        except subprocess.CalledProcessError as e:
            raise NmError.from_process_error(e)

        if nm_proc.stdout:
            # e.g.
            # 00000000 T osEepromRead
            #          U osMemSize
            for line in nm_proc.stdout.splitlines():
                nm_line = line.split()
                if len(nm_line) == 3 and label == nm_line[2]:
                    start_addr = int(nm_line[0], 16)
                    return [f"--start-address={start_addr}"]

        return ["--start-address=0"]

    @staticmethod
    def parse_objdump_flags(diff_flags: List[str]) -> List[str]:
        known_objdump_flags = ["-Mno-aliases"]
        known_objdump_flag_prefixes = ["-Mreg-names=", "--disassemble="]
        ret = []

        for flag in diff_flags:
            if flag in known_objdump_flags or flag.startswith(
                tuple(known_objdump_flag_prefixes)
            ):
                ret.append(flag)

        return ret

    @lru_cache()
    @staticmethod
    def run_objdump(
        target_data: bytes,
        platform: Platform,
        arch_flags: tuple[str, ...],
        label: str,
        objdump_flags: tuple[str, ...],
    ) -> str:
        flags = [
            flag for flag in objdump_flags if not flag.startswith(ASMDIFF_FLAG_PREFIX)
        ]
        flags += [
            "--disassemble-zeroes",
            "--line-numbers",
        ]

        # --reloc can cause issues with DOS disasm?
        if platform.id != "msdos":
            flags += ["--reloc"]

        with Sandbox() as sandbox:
            target_path = sandbox.path / "out.s"
            target_path.write_bytes(target_data)

            # If the flags contain `--disassemble=[symbol]`,
            # use that instead of `--start-address`.
            has_symbol = False
            for flag in flags:
                if flag.startswith("--disassemble="):
                    has_symbol = True
            if not has_symbol:
                flags.append("--disassemble")
                flags += DiffWrapper.get_objdump_target_function_flags(
                    sandbox, target_path, platform, label
                )

            flags += arch_flags

            if platform.objdump_cmd:
                try:
                    objdump_proc = sandbox.run_subprocess(
                        platform.objdump_cmd.split()
                        + list(map(shlex.quote, flags))
                        + [sandbox.rewrite_path(target_path)],
                        shell=True,
                        env={
                            "PATH": PATH,
                            "COMPILER_BASE_PATH": sandbox.rewrite_path(
                                settings.COMPILER_BASE_PATH
                            ),
                        },
                        timeout=settings.OBJDUMP_TIMEOUT_SECONDS,
                    )
                except subprocess.TimeoutExpired as e:
                    raise ObjdumpError("Timeout expired")
                except subprocess.CalledProcessError as e:
                    raise ObjdumpError.from_process_error(e)
            else:
                raise ObjdumpError(f"No objdump command for {platform.id}")

        out = objdump_proc.stdout
        return out

    @staticmethod
    def get_dump(
        elf_object: bytes,
        platform: Platform,
        diff_label: str,
        config: asm_differ.Config,
        diff_flags: List[str],
    ) -> str:
        if len(elf_object) == 0:
            raise AssemblyError("Asm empty")

        basedump = DiffWrapper.run_objdump(
            elf_object,
            platform,
            tuple(config.arch.arch_flags),
            diff_label,
            tuple(diff_flags),
        )
        if not basedump:
            raise ObjdumpError("Error running objdump")

        # Preprocess the dump
        try:
            basedump = asm_differ.preprocess_objdump_out(
                None, elf_object, basedump, config
            )
        except AssertionError as e:
            logger.exception("Error preprocessing dump")
            raise DiffError(f"Error preprocessing dump: {e}")
        except Exception as e:
            raise DiffError(f"Error preprocessing dump: {e}")

        return basedump

    @staticmethod
    def run_diff(basedump: str, mydump: str, config: Any) -> Dict[str, Any]:
        base_lines = asm_differ.process(basedump, config)
        my_lines = asm_differ.process(mydump, config)
        diff_output = asm_differ.do_diff(base_lines, my_lines, config)
        table_data = asm_differ.align_diffs(diff_output, diff_output, config)
        return config.formatter.raw(table_data)

    @staticmethod
    def diff(
        target_assembly: Assembly,
        platform: Platform,
        diff_label: str,
        compiled_elf: bytes,
        diff_flags: List[str],
    ) -> DiffResult:
        if platform == DUMMY:
            # Todo produce diff for dummy
            return DiffResult({"rows": ["a", "b"]})

        try:
            arch = asm_differ.get_arch(platform.arch or "")
        except ValueError:
            logger.error(f"Unsupported arch: {platform.arch}. Continuing assuming mips")
            arch = asm_differ.get_arch("mips")

        objdump_flags = DiffWrapper.parse_objdump_flags(diff_flags)

        config = DiffWrapper.create_config(arch, diff_flags)
        try:
            basedump = DiffWrapper.get_dump(
                bytes(target_assembly.elf_object),
                platform,
                diff_label,
                config,
                objdump_flags,
            )
        except Exception as e:
            raise DiffError(f"Error dumping target assembly: {e}")
        try:
            mydump = DiffWrapper.get_dump(
                compiled_elf, platform, diff_label, config, objdump_flags
            )
        except Exception as e:
            mydump = ""

        try:
            result = DiffWrapper.run_diff(basedump, mydump, config)
        except Exception as e:
            raise DiffError(f"Error running asm-differ: {e}")

        return DiffResult(result)
