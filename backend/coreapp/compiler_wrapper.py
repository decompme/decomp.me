from coreapp.models import Asm, Assembly, Compilation
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
        # TODO sandbox

        logger.debug(f"Compiling: {compile_command}")

        return_code = 0

        try:
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
    def run_objdump(object_path: Path):
        objdump_command = "mips-linux-gnu-objdump -m mips:4300 -drz -j .text " + str(object_path)

        logger.debug(f"Objdumping: {objdump_command}")

        try:
            result = subprocess.run(objdump_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)

            if result.returncode != 0:
                logger.error(result.stderr.decode())
                return (4, "Non-zero error code from objdump")

            output = result.stdout.decode()
        except Exception as e:
            logger.error(e)
            return (5, "Exception while running objdump")

        return (0, output)

    @staticmethod
    def compile_code(compiler: str, cpp_opts: str, as_opts: str, cc_opts: str, code: str, context: str):
        compiler_path = CompilerWrapper.base_path() / compiler.shortname

        if not compiler_path.exists():
            logger.error(f"Compiler {compiler.shortname} not found")
            return (None, "ERROR: Compiler not found")

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
            compiler.compile_cmd,
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
        compilation = Compilation(compiler, cpp_opts, as_opts, cc_opts, code, context, object_path)
        compilation.save()

        return (compilation, stderr)

    @staticmethod
    def assemble_asm(compiler:str, as_opts: str, asm: Asm, to_overwrite:Assembly = None) -> Assembly:
        compiler_path = CompilerWrapper.base_path() / compiler.shortname

        if not compiler_path.exists():
            logger.error(f"Compiler {compiler.shortname} not found")
            return "ERROR: Compiler not found"
        
        assemblies_path = settings.ASM_OBJECTS_PATH
        assemblies_path.mkdir(exist_ok=True, parents=True)
        
        temp_name = get_random_string(length=8)

        asm_path = assemblies_path / (temp_name + ".s")
        object_path = assemblies_path / (temp_name + ".o")

        with open(asm_path, "w", newline="\n") as f:
            f.write(ASM_MACROS + asm.data)

        assemble_status, stderr = CompilerWrapper.run_assembler(
            compiler.assemble_cmd,
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
        
        # Store Assembly to db
        assembly = Assembly(compiler, as_opts, source_asm=asm, object=object_path)

        if to_overwrite:
            assembly = to_overwrite
            assembly.object = object_path

        assembly.save()

        return assembly
