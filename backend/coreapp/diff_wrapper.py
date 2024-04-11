import logging
import base64
import requests

from typing import List, Dict, Any
from functools import lru_cache

import diff as asm_differ

from coreapp.platforms import DUMMY, Platform
from coreapp.flags import ASMDIFF_FLAG_PREFIX

from .compiler_wrapper import DiffResult, REMOTE_HOSTS

from .error import AssemblyError, DiffError, ObjdumpError
from .models.scratch import Assembly

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

        remote_host = REMOTE_HOSTS.get(platform.id)
        if remote_host is None:
            raise ObjdumpError(
                f"No objdump endpoint currently available for {platform.id}"
            )

        data = dict(
            target_data=base64.b64encode(target_data).decode("utf"),
            platform=platform.id,
            arch_flags=arch_flags,
            label=label,
            objdump_flags=objdump_flags,
            flags=flags,
        )
        try:
            res = requests.post(f"{remote_host}/objdump", json=data, timeout=30)
        except Exception as e:
            raise ObjdumpError(f"Request to {remote_host} failed!")

        try:
            response_json = res.json()
        except Exception as e:
            raise ObjdumpError(f"Invalid JSON returned {e}")

        if res.status_code != 200:
            raise ObjdumpError(response_json.get("error", "No error returned!"))

        objdump = response_json.get("objdump")
        if objdump is None:
            raise ObjdumpError("Response contained empty 'objdump'")

        return objdump

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
            return DiffResult({"rows": ["a", "b"]}, "")

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

        return DiffResult(result, "")
