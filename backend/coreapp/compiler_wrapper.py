import logging
import os
from dataclasses import dataclass
import requests
import base64

from typing import (
    Any,
    Callable,
    Dict,
    Optional,
    Tuple,
    TYPE_CHECKING,
    TypeVar,
    Sequence,
)

from django.conf import settings

from coreapp import compilers, platforms
from coreapp.compilers import Compiler

from coreapp.platforms import Platform
import coreapp.util as util

from .error import AssemblyError, CompilationError
from .libraries import Library
from .models.scratch import Asm, Assembly

# Thanks to Guido van Rossum for the following fix
# https://github.com/python/mypy/issues/5107#issuecomment-529372406
if TYPE_CHECKING:
    F = TypeVar("F")

    def lru_cache(maxsize: int = 128, typed: bool = False) -> Callable[[F], F]:
        pass

else:
    from functools import lru_cache

logger = logging.getLogger(__name__)


@dataclass
class DiffResult:
    result: Dict[str, Any]
    errors: str


@dataclass
class CompilationResult:
    elf_object: bytes
    errors: str


def _check_assembly_cache(*args: str) -> Tuple[Optional[Assembly], str]:
    hash = util.gen_hash(args)
    return Assembly.objects.filter(hash=hash).first(), hash


# TODO: dynamically populate this
# 1) reach out to expected hosts?
# 2) receive /register with a key from any host?

REMOTE_HOSTS = {
    "gba": "http://gba:9000",
    "gc_wii": "http://gc_wii:9000",
    "macosx": "http://macosx:9000",
    "msdos": "http://msdos:9000",
    "n3ds": "http://n3ds:9000",
    "n64": "http://n64:9000",
    "irix": "http://n64:9000",
    "nds_arm9": "http://nds_arm9:9000",
    "ps1": "http://ps1:9000",
    "ps2": "http://ps2:9000",
    "psp": "http://psp:9000",
    "saturn": "http://saturn:9000",
    "switch": "http://switch:9000",
    "win32": "http://win32:9000",
}


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
    @lru_cache(maxsize=settings.COMPILATION_CACHE_SIZE)
    def compile_code(
        compiler: Compiler,
        compiler_flags: str,
        code: str,
        context: str,
        function: str = "",
        libraries: Sequence[Library] = (),
    ) -> CompilationResult:
        if compiler == compilers.DUMMY:
            return CompilationResult(f"compiled({context}\n{code}".encode("UTF-8"), "")

        remote_host = REMOTE_HOSTS.get(compiler.platform.id)
        if remote_host is None:
            raise CompilationError(
                f"No compilation endpoint currently available for {compiler.platform.id}"
            )

        code = code.replace("\r\n", "\n")
        context = context.replace("\r\n", "\n")

        data = dict(
            compiler=compiler.to_dict(),
            compiler_flags=compiler_flags,
            code=code,
            context=context,
            function=function,
            libraries=[library.to_dict() for library in libraries],
        )
        try:
            res = requests.post(f"{remote_host}/compile", json=data, timeout=30)
        except Exception as e:
            raise CompilationError(
                f"Request to {remote_host} failed!"
            )

        try:
            response_json = res.json()
        except Exception as e:
            raise CompilationError(f"Invalid JSON returned {e}")

        if res.status_code != 200:
            raise CompilationError(response_json.get("error", "No error returned!"))

        b64_object_bytes = response_json.get("object_bytes")
        if b64_object_bytes is None:
            raise CompilationError("Empty 'object_bytes'")

        object_bytes = base64.b64decode(b64_object_bytes.encode("utf"))
        compile_errors = response_json.get("stdout", "")

        return CompilationResult(object_bytes, compile_errors)

    @staticmethod
    def assemble_asm(platform: Platform, asm: Asm) -> Assembly:

        cached_assembly, hash = _check_assembly_cache(platform.id, asm.hash)
        if cached_assembly:
            logger.debug(f"Assembly cache hit! hash: {hash}")
            return cached_assembly

        if platform == platforms.DUMMY:
            assembly = Assembly(
                hash=hash,
                arch=platform.arch,
                source_asm=asm,
                elf_object=f"assembled({asm.data})".encode("UTF-8"),
            )
            assembly.save()
            return assembly

        remote_host = REMOTE_HOSTS.get(platform.id)
        if remote_host is None:
            raise AssemblyError(
                f"No assemble endpoint currently available for {platform.id}"
            )

        data = dict(
            platform=platform.to_dict(),
            asm=asm.to_dict(),  # just send asm.data?
        )
        try:
            res = requests.post(f"{remote_host}/assemble", json=data, timeout=30)
        except Exception as e:
            raise AssemblyError(f"Failed to send assembly to remote server: {e}")

        try:
            response_json = res.json()
        except Exception as e:
            raise AssemblyError(f"Invalid JSON returned {e}")

        if res.status_code != 200:
            raise AssemblyError(response_json.get("error", "No error returned!"))

        assembly_bytes = response_json.get("assembly_bytes")
        if assembly_bytes is None:
            raise AssemblyError("Response contained empty 'assembly_bytes'")

        try:
            elf_object = base64.b64decode(assembly_bytes.encode("utf"))
        except Exception as e:
            raise AssemblyError(f"Invalid base64 data returned {e}")

        assembly = Assembly(
            hash=hash,
            arch=platform.arch,
            source_asm=asm,
            elf_object=elf_object,
        )
        assembly.save()
        return assembly
