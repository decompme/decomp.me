import logging
import os
import re
import subprocess
from dataclasses import dataclass
from platform import uname
import time

from typing import Any, Callable, Dict, Optional, Tuple, TYPE_CHECKING, TypeVar

from django.conf import settings

from coreapp import compilers, platforms
from coreapp.compilers import Compiler

from coreapp.platforms import Platform
import coreapp.util as util

from .error import AssemblyError, CompilationError
from .models.scratch import Asm, Assembly
from .sandbox import Sandbox

# Thanks to Guido van Rossum for the following fix
# https://github.com/python/mypy/issues/5107#issuecomment-529372406
if TYPE_CHECKING:
    F = TypeVar("F")

    def lru_cache(maxsize: int = 128, typed: bool = False) -> Callable[[F], F]:
        pass

else:
    from functools import lru_cache

logger = logging.getLogger(__name__)

PATH: str
if settings.USE_SANDBOX_JAIL:
    PATH = "/bin:/usr/bin"
else:
    PATH = os.environ["PATH"]

WINE: str
if "microsoft" in uname().release.lower() and not settings.USE_SANDBOX_JAIL:
    logger.info("WSL detected & nsjail disabled: wine not required.")
    WINE = ""
else:
    WINE = "wine"

WIBO: str
if "microsoft" in uname().release.lower() and not settings.USE_SANDBOX_JAIL:
    logger.info("WSL detected & nsjail disabled: wibo not required.")
    WIBO = ""
else:
    WIBO = "wibo"


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


class CompilerWrapper:
    @staticmethod
    def filter_compiler_flags(compiler_flags: str) -> str:
        # Remove irrelevant flags that are part of the base compiler configs or
        # don't affect matching, but clutter the compiler settings field.
        # TODO: use cfg for this?
        skip_flags_with_args = {
            "-B",
            "-I",
            "-D",
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
        ]

        for str in filter_strings:
            input = re.sub(str, "", input)

        return input.strip()

    @staticmethod
    @lru_cache(maxsize=settings.COMPILATION_CACHE_SIZE)
    def compile_code(
        compiler: Compiler,
        compiler_flags: str,
        code: str,
        context: str,
        function: str = "",
    ) -> CompilationResult:
        if compiler == compilers.DUMMY:
            return CompilationResult(f"compiled({context}\n{code}".encode("UTF-8"), "")

        code = code.replace("\r\n", "\n")
        context = context.replace("\r\n", "\n")

        with Sandbox() as sandbox:
            ext = compiler.language.get_file_extension()
            code_file = f"code.{ext}"
            ctx_file = f"ctx.{ext}"

            code_path = sandbox.path / code_file
            object_path = sandbox.path / "object.o"
            with code_path.open("w") as f:
                f.write(f'#line 1 "{ctx_file}"\n')
                f.write(context)
                f.write("\n")

                f.write(f'#line 1 "{code_file}"\n')
                f.write(code)
                f.write("\n")

            cc_cmd = compiler.cc

            # Fix for MWCC line numbers in GC 3.0+
            if compiler.is_mwcc:
                ctx_path = sandbox.path / ctx_file
                ctx_path.touch()

            # IDO hack to support -KPIC
            if compiler.is_ido and "-KPIC" in compiler_flags:
                cc_cmd = cc_cmd.replace("-non_shared", "")

            # Run compiler
            try:
                st = round(time.time() * 1000)
                compile_proc = sandbox.run_subprocess(
                    cc_cmd,
                    mounts=(
                        [compiler.path] if compiler.platform != platforms.DUMMY else []
                    ),
                    shell=True,
                    env={
                        "PATH": PATH,
                        "WINE": WINE,
                        "WIBO": WIBO,
                        "INPUT": sandbox.rewrite_path(code_path),
                        "OUTPUT": sandbox.rewrite_path(object_path),
                        "COMPILER_DIR": sandbox.rewrite_path(compiler.path),
                        "COMPILER_FLAGS": sandbox.quote_options(compiler_flags),
                        "FUNCTION": function,
                        "MWCIncludes": "/tmp",
                        "TMPDIR": "/tmp",
                    },
                    timeout=settings.COMPILATION_TIMEOUT_SECONDS,
                )
                et = round(time.time() * 1000)
                logging.debug(f"Compilation finished in: {et - st} ms")
            except subprocess.CalledProcessError as e:
                # Compilation failed
                msg = e.stdout

                logging.debug("Compilation failed: %s", msg)
                raise CompilationError(CompilerWrapper.filter_compile_errors(msg))
            except ValueError as e:
                # Shlex issue?
                logging.debug("Compilation failed: %s", e)
                raise CompilationError(str(e))
            except subprocess.TimeoutExpired as e:
                raise CompilationError("Compilation failed: timeout expired")

            if not object_path.exists():
                error_msg = (
                    "Compiler did not create an object file: %s" % compile_proc.stdout
                )
                logging.debug(error_msg)
                raise CompilationError(error_msg)

            object_bytes = object_path.read_bytes()

            if not object_bytes:
                raise CompilationError("Compiler created an empty object file")

            compile_errors = CompilerWrapper.filter_compile_errors(compile_proc.stdout)

            return CompilationResult(object_path.read_bytes(), compile_errors)

    @staticmethod
    def assemble_asm(platform: Platform, asm: Asm) -> Assembly:
        if not platform.assemble_cmd:
            raise AssemblyError(
                f"Assemble command for platform {platform.id} not found"
            )

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

        with Sandbox() as sandbox:
            asm_path = sandbox.path / "asm.s"
            data = asm.data.replace(".section .late_rodata", ".late_rodata")
            asm_path.write_text(platform.asm_prelude + data)

            object_path = sandbox.path / "object.o"

            # Run assembler
            try:
                assemble_proc = sandbox.run_subprocess(
                    platform.assemble_cmd,
                    mounts=[],
                    shell=True,
                    env={
                        "PATH": PATH,
                        "INPUT": sandbox.rewrite_path(asm_path),
                        "OUTPUT": sandbox.rewrite_path(object_path),
                    },
                    timeout=settings.ASSEMBLY_TIMEOUT_SECONDS,
                )
            except subprocess.CalledProcessError as e:
                raise AssemblyError.from_process_error(e)
            except subprocess.TimeoutExpired as e:
                raise AssemblyError("Timeout expired")

            # Assembly failed
            if assemble_proc.returncode != 0:
                raise AssemblyError(
                    f"Assembler failed with error code {assemble_proc.returncode}"
                )

            if not object_path.exists():
                raise AssemblyError("Assembler did not create an object file")

            assembly = Assembly(
                hash=hash,
                arch=platform.arch,
                source_asm=asm,
                elf_object=object_path.read_bytes(),
            )
            assembly.save()
            return assembly
