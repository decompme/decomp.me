import logging
import os
import re
import subprocess
from dataclasses import dataclass
import time

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
from coreapp.compilers import Compiler, CompilerType

from coreapp.flags import Language
from coreapp.platforms import Platform
import coreapp.util as util

from .error import AssemblyError, CompilationError
from .libraries import Library
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

WINE = "wine"
WIBO = "wibo"


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

        code = code.replace("\r\n", "\n")
        context = context.replace("\r\n", "\n")

        with Sandbox() as sandbox:
            ext = compiler.language.get_file_extension()
            code_file = f"code.{ext}"
            src_file = f"src.{ext}"
            ctx_file = f"ctx.{ext}"

            code_path = sandbox.path / code_file
            object_path = sandbox.path / "object.o"
            skip_line_directive = (
                compiler.type == CompilerType.IDO
                and compiler.language == Language.PASCAL
            )
            with code_path.open("w") as f:
                if not skip_line_directive:
                    f.write(f'#line 1 "{ctx_file}"\n')
                f.write(context)
                f.write("\n")

                if not skip_line_directive:
                    f.write(f'#line 1 "{src_file}"\n')
                f.write(code)
                f.write("\n")

            cc_cmd = compiler.cc

            # MWCC requires the file to exist for DWARF line numbers,
            # and requires the file contents for error messages
            if compiler.type == CompilerType.MWCC:
                ctx_path = sandbox.path / ctx_file
                ctx_path.touch()
                with ctx_path.open("w") as f:
                    f.write(context)
                    f.write("\n")

                src_path = sandbox.path / src_file
                src_path.touch()
                with src_path.open("w") as f:
                    f.write(code)
                    f.write("\n")

            # IDO hack to support -KPIC
            if compiler.type == CompilerType.IDO and "-KPIC" in compiler_flags:
                cc_cmd = cc_cmd.replace("-non_shared", "")

            if compiler.platform != platforms.DUMMY and not compiler.path.exists():
                logging.warning("%s does not exist, creating it!", compiler.path)
                compiler.path.mkdir(parents=True)

            # Run compiler
            try:
                st = round(time.time() * 1000)
                libraries_compiler_flags = " ".join(
                    (
                        compiler.library_include_flag
                        + str(lib.get_include_path(compiler.platform.id))
                        for lib in libraries
                    )
                )
                wibo_path = settings.COMPILER_BASE_PATH / "common" / "wibo_dlls"
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
                        "WIBO_PATH": sandbox.rewrite_path(wibo_path),
                        "INPUT": sandbox.rewrite_path(code_path),
                        "OUTPUT": sandbox.rewrite_path(object_path),
                        "COMPILER_DIR": sandbox.rewrite_path(compiler.path),
                        "COMPILER_FLAGS": sandbox.quote_options(
                            compiler_flags + " " + libraries_compiler_flags
                        ),
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
            except subprocess.TimeoutExpired:
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

            return CompilationResult(object_bytes, compile_errors)

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
            )
            assembly.save()
            return assembly

        with Sandbox() as sandbox:
            asm_prelude_path = sandbox.path / "prelude.s"
            asm_prelude_path.write_text(platform.asm_prelude)

            asm_path = sandbox.path / "asm.s"
            data = asm.data.replace(".section .late_rodata", ".late_rodata")
            asm_path.write_text(data + "\n")

            object_path = sandbox.path / "object.o"

            # Run assembler
            try:
                assemble_proc = sandbox.run_subprocess(
                    platform.assemble_cmd,
                    mounts=[],
                    shell=True,
                    env={
                        "PATH": PATH,
                        "PRELUDE": sandbox.rewrite_path(asm_prelude_path),
                        "INPUT": sandbox.rewrite_path(asm_path),
                        "OUTPUT": sandbox.rewrite_path(object_path),
                        "COMPILER_BASE_PATH": sandbox.rewrite_path(
                            settings.COMPILER_BASE_PATH
                        ),
                    },
                    timeout=settings.ASSEMBLY_TIMEOUT_SECONDS,
                )
            except subprocess.CalledProcessError as e:
                raise AssemblyError.from_process_error(e)
            except subprocess.TimeoutExpired:
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
