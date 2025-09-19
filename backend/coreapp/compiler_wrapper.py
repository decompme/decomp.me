import logging
import re
from dataclasses import dataclass
from typing import (
    Any,
    Dict,
    Optional,
    Tuple,
)

import coreapp.util as util

from models.scratch import Asm, Assembly

from cromper_client import get_cromper_client


logger = logging.getLogger(__name__)


@dataclass
class DiffResult:
    result: Optional[Dict[str, Any]] = None
    errors: Optional[str] = None


@dataclass
class CompilationResult:
    elf_object: bytes
    errors: str


def _check_assembly_cache(*args: str) -> Tuple[Optional[Assembly], str]:
    hash = util.gen_hash(args)
    return Assembly.objects.filter(hash=hash).first(), hash


class CompilerWrapper:
    @staticmethod
    def filter_compiler_flags(compiler_flags: str) -> str:
        # Remove irrelevant flags that are part of the base compiler configs or
        # don't affect matching, but clutter the compiler settings field.
        # TODO: use cfg for this?
        skip_flags_with_args = {
            "-B",
            "-I",
            "-U",
        }
        skip_flags = {
            "-ffreestanding",
            "-non_shared",
            "-Xcpluscomm",
            "-Wab,-r4300_mul",
            "-c",
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
    def filter_compile_errors(input: str) -> str:
        filter_strings = [
            r"wine: could not load .*\.dll.*\n?",
            r"wineserver: could not save registry .*\n?",
            r"### .*\.exe Driver Error:.*\n?",
            r"#   Cannot find my executable .*\n?",
            r"### MWCPPC\.exe Driver Error:.*\n?",
            r"Fontconfig error:.*\n?",
        ]

        for str in filter_strings:
            input = re.sub(str, "", input)

        return input.strip()

    @staticmethod
    def compile_code(
        compiler: Dict[str, Any],
        compiler_flags: str,
        code: str,
        context: str,
        libraries: list[str] = [],
    ) -> CompilationResult:
        cromper = get_cromper_client()
        result = cromper.compile_code(
            compiler=compiler,
            compiler_flags=compiler_flags,
            code=code,
            context=context,
            libraries=libraries,
        )
        return CompilationResult(
            elf_object=result["elf_object"], errors=result["errors"]
        )

    @staticmethod
    def assemble_asm(platform: str, asm: Asm) -> Assembly:
        cached_assembly, hash = _check_assembly_cache(platform, asm.hash)
        if cached_assembly:
            logger.debug(f"Assembly cache hit! hash: {hash}")
            return cached_assembly

        cromper = get_cromper_client()
        result = cromper.assemble_asm(platform=platform, asm=asm)

        assembly = Assembly(
            hash=result["hash"],
            arch=result["arch"],
            source_asm=asm,
            elf_object=result["elf_object"],
        )
        assembly.save()
        return assembly


## TODO fix library typing
