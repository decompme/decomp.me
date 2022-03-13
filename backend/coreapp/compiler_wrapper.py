import logging
import os
import subprocess
from dataclasses import dataclass
from functools import lru_cache
from platform import uname
from typing import Any, Dict, Optional, Tuple

from django.conf import settings

from coreapp import compilers, platforms
from coreapp.compilers import Compiler

from coreapp.platforms import Platform
from . import util

from .error import AssemblyError, CompilationError
from .models.scratch import Asm, Assembly
from .sandbox import Sandbox

logger = logging.getLogger(__name__)

DiffResult = Dict[str, Any]

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
            "-woff",
            "-B",
            "-I",
            "-D",
            "-U",
            "-G",
        }
        skip_flags = {
            "-ffreestanding",
            "-non_shared",
            "-Xcpluscomm",
            "-Xfullwarn",
            "-fullwarn",
            "-Wab,-r4300_mul",
            "-c",
            "-w",
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
        return (
            input.replace("wine: could not load kernel32.dll, status c0000135\n", "")
            .replace(
                "wineserver: could not save registry branch to system.reg : Read-only file system\n",
                "",
            )
            .strip()
        )

    @staticmethod
    @lru_cache(maxsize=settings.COMPILATION_CACHE_SIZE)  # type: ignore
    def compile_code(
        compiler: Compiler, compiler_flags: str, code: str, context: str
    ) -> CompilationResult:
        if compiler == compilers.DUMMY:
            return CompilationResult(f"compiled({context}\n{code}".encode("UTF-8"), "")

        code = code.replace("\r\n", "\n")
        context = context.replace("\r\n", "\n")

        with Sandbox() as sandbox:
            code_path = sandbox.path / "code.c"
            object_path = sandbox.path / "object.o"
            with code_path.open("w") as f:
                f.write('#line 1 "ctx.c"\n')
                f.write(context)
                f.write("\n")

                f.write('#line 1 "src.c"\n')
                f.write(code)
                f.write("\n")

            cc_cmd = compiler.cc

            # IDO hack to support -KPIC
            if compiler.is_ido and "-KPIC" in compiler_flags:
                cc_cmd = cc_cmd.replace("-non_shared", "")

            # Run compiler
            try:
                compile_proc = sandbox.run_subprocess(
                    cc_cmd,
                    mounts=[compiler.path],
                    shell=True,
                    env={
                        "PATH": PATH,
                        "WINE": WINE,
                        "INPUT": sandbox.rewrite_path(code_path),
                        "OUTPUT": sandbox.rewrite_path(object_path),
                        "COMPILER_DIR": sandbox.rewrite_path(compiler.path),
                        "COMPILER_FLAGS": sandbox.quote_options(compiler_flags),
                        "MWCIncludes": "/tmp",
                    },
                )
            except subprocess.CalledProcessError as e:
                # Compilation failed
                if e.stdout:
                    msg = f"{e.stdout}\n{e.stderr}"
                else:
                    msg = e.stderr

                logging.debug("Compilation failed: %s", msg)
                raise CompilationError(e.stderr)

            if not object_path.exists():
                raise CompilationError("Compiler did not create an object file")

            object_bytes = object_path.read_bytes()

            if not object_bytes:
                raise CompilationError("Compiler created an empty object file")

            compile_errors = CompilerWrapper.filter_compile_errors(compile_proc.stderr)

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
            asm_path.write_text(platform.asm_prelude + asm.data)

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
                )
            except subprocess.CalledProcessError as e:
                raise AssemblyError.from_process_error(e)

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
