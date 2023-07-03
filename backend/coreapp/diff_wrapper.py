import json
import logging
import subprocess
from pathlib import Path
from typing import List

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

        return asm_differ.Config(
            arch=arch,
            # Build/objdump options
            diff_obj=True,
            objfile="",
            make=False,
            source_old_binutils=True,
            diff_section=".text",
            inlines=False,
            max_function_size_lines=MAX_FUNC_SIZE_LINES,
            max_function_size_bytes=MAX_FUNC_SIZE_LINES * 4,
            # Display options
            formatter=asm_differ.JsonFormatter(arch_str=arch.name),
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
        known_objdump_flags = ["-Mreg-names=32", "-Mno-aliases"]
        ret = []

        for flag in known_objdump_flags:
            if flag in diff_flags:
                ret.append(flag)

        return ret

    @staticmethod
    def run_objdump(
        target_data: bytes,
        platform: Platform,
        config: asm_differ.Config,
        label: str,
        flags: List[str],
    ) -> str:
        flags = [flag for flag in flags if not flag.startswith(ASMDIFF_FLAG_PREFIX)]
        flags += [
            "--disassemble",
            "--disassemble-zeroes",
            "--line-numbers",
        ]

        # --reloc seems to add a bunch of noise to x86 disasm?
        if platform.arch != "i686":
            flags += ["--reloc"]

        with Sandbox() as sandbox:
            target_path = sandbox.path / "out.s"
            target_path.write_bytes(target_data)

            flags += DiffWrapper.get_objdump_target_function_flags(
                sandbox, target_path, platform, label
            )

            flags += config.arch.arch_flags

            if platform.objdump_cmd:
                try:
                    objdump_proc = sandbox.run_subprocess(
                        platform.objdump_cmd.split()
                        + flags
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
            elf_object, platform, config, diff_label, diff_flags
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
    def diff(
        target_assembly: Assembly,
        platform: Platform,
        diff_label: str,
        compiled_elf: bytes,
        diff_flags: List[str],
    ) -> DiffResult:
        if platform == DUMMY:
            # Todo produce diff for dummy
            return DiffResult({"rows": ["a", "b"]}, "")

        try:
            arch = asm_differ.get_arch(platform.arch or "")
        except ValueError:
            logger.error(f"Unsupported arch: {platform.arch}. Continuing assuming mips")
            arch = asm_differ.get_arch("mips")

        objdump_flags = DiffWrapper.parse_objdump_flags(diff_flags)

        config = DiffWrapper.create_config(arch, diff_flags)

        basedump = DiffWrapper.get_dump(
            bytes(target_assembly.elf_object),
            platform,
            diff_label,
            config,
            objdump_flags,
        )
        try:
            mydump = DiffWrapper.get_dump(
                compiled_elf, platform, diff_label, config, objdump_flags
            )
        except Exception as e:
            mydump = ""

        try:
            display = asm_differ.Display(basedump, mydump, config)
        except Exception as e:
            raise DiffError(f"Error running asm-differ: {e}")

        try:
            # TODO: It would be nice to get a python object from `run_diff()` to avoid the
            # JSON roundtrip. See https://github.com/simonlindholm/asm-differ/issues/56
            result = DiffResult(json.loads(display.run_diff()[0]), "")
        except Exception as e:
            raise DiffError(f"Error running asm-differ: {e}")

        return result
