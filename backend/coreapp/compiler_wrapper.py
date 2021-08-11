from typing import Optional
from coreapp.models import Asm, Assembly, Compilation
from coreapp import util
from coreapp.sandbox import Sandbox
from django.conf import settings
from django.utils.crypto import get_random_string
import json
import logging
import os
from pathlib import Path
import shlex
import subprocess
from tempfile import TemporaryDirectory

logger = logging.getLogger(__name__)

ASM_MACROS = """.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

"""

def load_compilers() -> dict:
    ret = {}

    compiler_dirs = next(os.walk(settings.COMPILER_BASE_PATH))
    for compiler_id in compiler_dirs[1]:
        config_path = Path(settings.COMPILER_BASE_PATH / compiler_id / "config.json")
        if config_path.exists():
            with open(config_path) as f:
                ret[compiler_id] = json.load(f)

    return ret

compilers = load_compilers()


def check_compilation_cache(*args) -> Optional[Compilation]:
    hash = util.gen_hash(args)
    return Compilation.objects.filter(hash=hash).first(), hash

def check_assembly_cache(*args) -> Optional[Compilation]:
    hash = util.gen_hash(args)
    return Assembly.objects.filter(hash=hash).first(), hash

class CompilerWrapper:
    def base_path():
        return settings.COMPILER_BASE_PATH

    @staticmethod
    def compile_code(compiler: str, cpp_opts: str, as_opts: str, cc_opts: str, code: str, context: str, to_regenerate: Compilation = None):
        if compiler not in compilers:
            logger.debug(f"Compiler {compiler} not found")
            return (None, "ERROR: Compiler not found")

        compiler_cfg = compilers[compiler]

        if not to_regenerate:
            cached_compilation, hash = check_compilation_cache(compiler, cpp_opts, as_opts, cc_opts, code, context)
            if cached_compilation:
                logger.debug(f"Compilation cache hit!")
                return (cached_compilation, cached_compilation.stderr)

        with Sandbox() as sandbox:
            code_path = sandbox.path / "code.c"
            object_path = sandbox.path / "object.o"
            with code_path.open("w") as f:
                f.write('#line 1 "ctx.c"\n')
                f.write(context)
                f.write('\n')

                f.write('#line 1 "src.c"\n')
                f.write(code)
                f.write('\n')

            compiler_path = CompilerWrapper.base_path() / compiler

            # Run compiler
            try:
                compile_proc = sandbox.run_subprocess(
                    compiler_cfg["cc"],
                    mounts=[compiler_path],
                    shell=True,
                    env={
                    "PATH": "/bin:/usr/bin",
                    "INPUT": sandbox.rewrite_path(code_path),
                    "OUTPUT": sandbox.rewrite_path(object_path),
                    "COMPILER_DIR": sandbox.rewrite_path(compiler_path),
                    "CPP_OPTS": sandbox.quote_options(cpp_opts),
                    "CC_OPTS": sandbox.quote_options(cc_opts),
                    "AS_OPTS": sandbox.quote_options(as_opts),
                })
            except subprocess.CalledProcessError as e:
                # Compilation failed
                return (None, e.stderr)

            if not object_path.exists():
                logger.error("Compiler did not create an object file")
                return (None, "ERROR: Compiler did not create an object file")

            if to_regenerate:
                compilation = to_regenerate
                compilation.elf_object=elf_object
            else:
                # Store Compilation to db
                compilation = Compilation(
                    hash=hash,
                    compiler=compiler,
                    cpp_opts=cpp_opts,
                    as_opts=as_opts,
                    cc_opts=cc_opts,
                    source_code=code,
                    context=context,
                    elf_object=object_path.read_bytes(),
                    stderr=compile_proc.stderr
                )
            compilation.save()

            return (compilation, compile_proc.stderr)

    @staticmethod
    def assemble_asm(compiler:str, as_opts: str, asm: Asm, to_regenerate:Assembly = None) -> Assembly:
        if compiler not in compilers:
            logger.error(f"Compiler {compiler} not found")
            return "ERROR: Compiler not found"
        
        # Use the cache if we're not manually re-running an Assembly
        if not to_regenerate:
            cached_assembly, hash = check_assembly_cache(compiler, as_opts, asm)
            if cached_assembly:
                logger.debug(f"Assembly cache hit!")
                return cached_assembly

        compiler_cfg = compilers[compiler]

        with Sandbox() as sandbox:
            asm_path = sandbox.path / "asm.s"
            asm_path.write_text(ASM_MACROS + asm.data)

            object_path = sandbox.path / "object.o"
            compiler_path = Path(CompilerWrapper.base_path() / compiler)

            # Run assembler
            try:
                assemble_proc = sandbox.run_subprocess(
                    compiler_cfg["as"],
                    mounts=[compiler_path],
                    shell=True,
                    env={
                    "INPUT": sandbox.rewrite_path(asm_path),
                    "OUTPUT": sandbox.rewrite_path(object_path),
                    "COMPILER_DIR": sandbox.rewrite_path(compiler_path),
                    "AS_OPTS": sandbox.quote_options(as_opts),
                })
            except subprocess.CalledProcessError as e:
                # Compilation failed
                return (None, e.stderr)

            # Assembly failed
            if assemble_proc.returncode != 0:
                return None #f"ERROR: {assemble_proc.stderr}"

            if not object_path.exists():
                logger.error("Assembler did not create an object file")
                return (None, "ERROR: Assembler did not create an object file")

            if to_regenerate:
                assembly = to_regenerate
                assembly.elf_object = elf_object
            else:
                assembly = Assembly(
                    hash=hash,
                    compiler=compiler,
                    as_opts=as_opts,
                    source_asm=asm,
                    elf_object=object_path.read_bytes(),
                )
            assembly.save()

            return assembly
