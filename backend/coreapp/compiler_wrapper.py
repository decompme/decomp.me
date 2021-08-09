from typing import Optional
from coreapp.models import Asm, Assembly, Compilation
from coreapp import util
from django.conf import settings
from django.utils.crypto import get_random_string
import json
import logging
import os
from pathlib import Path
import subprocess

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
        compile_command = f"bash -c \"{compile_command}\""

        logger.debug(f"Compiling: {compile_command}")

        return_code = 0

        try:
            # TODO sandbox
            result = subprocess.run(compile_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
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
        assemble_command = f"bash -c \"{assemble_command}\""
        # TODO sandbox
        
        logger.debug(f"Assembling: {assemble_command}")

        return_code = 0

        try:
            result = subprocess.run(assemble_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
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
        compiler_path = CompilerWrapper.base_path() / compiler

        compile_cfg = compilers[compiler]

        if not compiler_path.exists():
            logger.error(f"Compiler {compiler} not found")
            return (None, "ERROR: Compiler not found")

        cached_compilation, hash = check_compilation_cache(compiler, cpp_opts, as_opts, cc_opts, code, context)
        if cached_compilation:
            logger.debug(f"Compilation cache hit!")
            return (cached_compilation, cached_compilation.stderr)

        temp_name = get_random_string(length=8)
        settings.COMPILATION_OBJECTS_PATH.mkdir(exist_ok=True, parents=True)
        code_path = settings.COMPILATION_OBJECTS_PATH / (temp_name + ".c")
        object_path = settings.COMPILATION_OBJECTS_PATH / (temp_name + ".o")

        with open(code_path, "w", newline="\n") as f:
            f.write('#line 1 "ctx.c"\n')
            f.write(context)
            f.write('\n')

            f.write('#line 1 "src.c"\n')
            f.write(code)
            f.write('\n')

        # Run compiler
        compile_status, stderr = CompilerWrapper.run_compiler(
            compile_cfg["cc"],
            code_path,
            object_path,
            compiler_path,
            cpp_opts,
            as_opts,
            cc_opts,
        )

        os.remove(code_path)

        # Compilation failed
        if compile_status != 0:
            if object_path.exists():
                os.remove(object_path)
            return (None, stderr)
        
        # Store Compilation to db
        compilation = Compilation(
            hash=hash,
            compiler=compiler,
            cpp_opts=cpp_opts,
            as_opts=as_opts,
            cc_opts=cc_opts,
            source_code=code,
            context=context,
            object_path=object_path,
            stderr=stderr
        )
        compilation.save()

        return (compilation, stderr)

    @staticmethod
    def assemble_asm(compiler:str, as_opts: str, asm: Asm, to_overwrite:Assembly = None) -> Assembly:
        compiler_path = CompilerWrapper.base_path() / compiler

        if not compiler_path.exists():
            logger.error(f"Compiler {compiler} not found")
            return "ERROR: Compiler not found"
        
        # Check the cache if we're not manually re-running an Assembly
        cached_assembly, hash = check_assembly_cache(compiler, as_opts, asm)
        if not to_overwrite and cached_assembly:
            logger.debug(f"Assembly cache hit!")
            return cached_assembly

        compiler_cfg = compilers[compiler]

        assemblies_path = settings.ASM_OBJECTS_PATH
        assemblies_path.mkdir(exist_ok=True, parents=True)
        
        temp_name = get_random_string(length=8)

        asm_path = assemblies_path / (temp_name + ".s")
        object_path = assemblies_path / (temp_name + ".o")

        with open(asm_path, "w", newline="\n") as f:
            f.write(ASM_MACROS + asm.data)

        assemble_status, stderr = CompilerWrapper.run_assembler(
            compiler_cfg["as"],
            asm_path,
            object_path,
            compiler_path,
            as_opts
        )

        os.remove(asm_path)

        # Assembly failed
        if assemble_status != 0:
            if object_path.exists():
                os.remove(object_path)
            return None #f"ERROR: {assemble_status[1]}"

        if to_overwrite:
            assembly = to_overwrite
            assembly.object = object_path
        else:
            assembly = Assembly(
                hash=hash,
                compiler=compiler,
                as_opts=as_opts,
                source_asm=asm,
                object=object_path,
            )
        assembly.save()

        return assembly
