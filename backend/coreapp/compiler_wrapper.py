from typing import Optional
from coreapp.models import Asm, Assembly, Compilation
from coreapp import util
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
    def run_compiler(compile_cmd: str, input_path: Path, output_path: Path, compiler_path: Path, cpp_opts:str, as_opts: str, cc_opts: str):
        compile_command = "set -o pipefail; " +  compile_cmd \
            .replace("$INPUT", str(input_path)) \
            .replace("$OUTPUT", str(output_path)) \
            .replace("$COMPILER_PATH", str(compiler_path)) \
            .replace("$CPP_OPTS", cpp_opts) \
            .replace("$CC_OPTS", cc_opts) \
            .replace("$AS_OPTS", as_opts)

        logger.debug(f"Compiling: {compile_command}")

        return_code = 0

        try:
            result = subprocess.run(["bash", "-c", compile_command], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            stderr = result.stderr.decode()

            if result.returncode != 0:
                logger.debug("Compiler returned with a non-zero return code:\n" + result.stderr.decode())
                return_code = 1
        except Exception as e:
            logger.error(e)
            return_code = 2
        
        if not output_path.exists():
            logger.error(f"Compiled object does not exist: {str(output_path)}")
            return_code = 3

        return (return_code, stderr)

    @staticmethod
    def run_assembler(assemble_cmd: str, input_path: Path, output_path: Path, compiler_path: Path, as_opts: str):
        assemble_command = "set -o pipefail; " + assemble_cmd \
            .replace("$INPUT", str(input_path)) \
            .replace("$OUTPUT", str(output_path)) \
            .replace("$COMPILER_PATH", str(compiler_path)) \
            .replace("$AS_OPTS", as_opts)
        # TODO sandbox
        
        logger.debug(f"Assembling: {assemble_command}")

        return_code = 0

        try:
            result = subprocess.run(["bash", "-c", assemble_command], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            stderr = result.stderr.decode()

            if result.returncode != 0:
                logger.error(stderr)
                return_code = 1
        except Exception as e:
            logger.error(e)
            return_code = 2
        
        if not output_path.exists():
            logger.error(f"Assembled object does not exist: {str(output_path)}")
            return_code = 3

        return (return_code, stderr)

    @staticmethod
    def compile_code(compiler: str, cpp_opts: str, as_opts: str, cc_opts: str, code: str, context: str):
        if compiler not in compilers:
            logger.debug(f"Compiler {compiler} not found")
            return (None, "ERROR: Compiler not found")

        compiler_cfg = compilers[compiler]

        cached_compilation, hash = check_compilation_cache(compiler, cpp_opts, as_opts, cc_opts, code, context)
        if cached_compilation:
            logger.debug(f"Compilation cache hit!")
            return (cached_compilation, cached_compilation.stderr)

        with TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            code_path = temp_path / "code.c"
            object_path = temp_path / "object.o"
            with code_path.open("w") as f:
                f.write('#line 1 "ctx.c"\n')
                f.write(context)
                f.write('\n')

                f.write('#line 1 "src.c"\n')
                f.write(code)
                f.write('\n')

            compiler_path = CompilerWrapper.base_path() / compiler

            # Run compiler
            compile_status, stderr = CompilerWrapper.run_compiler(
                compiler_cfg["cc"],
                code_path,
                object_path,
                compiler_path,
                cpp_opts,
                as_opts,
                cc_opts
            )

            # Compilation failed
            if compile_status != 0:
                return (None, stderr)

            elf_object = object_path.read_bytes()
            if len(elf_object) == 0:
                logger.error("Compiler did not create an object file")
                return (None, "ERROR: Compiler did not create an object file")

            # Store Compilation to db
            compilation = Compilation(
                hash=hash,
                compiler=compiler,
                cpp_opts=cpp_opts,
                as_opts=as_opts,
                cc_opts=cc_opts,
                source_code=code,
                context=context,
                elf_object=elf_object,
                stderr=stderr
            )
            compilation.save()

            return (compilation, stderr)

    @staticmethod
    def assemble_asm(compiler:str, as_opts: str, asm: Asm) -> Assembly:
        if compiler not in compilers:
            logger.error(f"Compiler {compiler} not found")
            return "ERROR: Compiler not found"
        
        # Check the cache if we're not manually re-running an Assembly
        cached_assembly, hash = check_assembly_cache(compiler, as_opts, asm)
        if cached_assembly:
            logger.debug(f"Assembly cache hit!")
            return cached_assembly

        compiler_cfg = compilers[compiler]

        with TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            asm_path = temp_path / "asm.s"
            asm_path.write_text(ASM_MACROS + asm.data)

            object_path = temp_path / "object.o"
            compiler_path = Path(CompilerWrapper.base_path() / compiler)

            assemble_status, stderr = CompilerWrapper.run_assembler(
                compiler_cfg["as"],
                asm_path,
                object_path,
                compiler_path,
                as_opts
            )

            # Assembly failed
            if assemble_status != 0:
                return None #f"ERROR: {assemble_status[1]}"

            elf_object = object_path.read_bytes()
            if len(elf_object) == 0:
                logger.error("Assembler did not create an object file")
                return (None, "ERROR: Assembler did not create an object file")

            assembly = Assembly(
                hash=hash,
                compiler=compiler,
                as_opts=as_opts,
                source_asm=asm,
                elf_object=elf_object,
            )
            assembly.save()

            return assembly
