from coreapp.models import Asm, Assembly, Compilation, Compiler, CompilerConfiguration
from django.conf import settings
from django.utils.crypto import get_random_string
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

# todo consolidate duplicates of this
def asm_objects_path() -> Path:
    return Path(os.path.join(settings.LOCAL_FILE_DIR, 'assemblies'))

def compilation_objects_path() -> Path:
    return Path(os.path.join(settings.LOCAL_FILE_DIR, 'compilations'))

class CompilerWrapper:
    def base_path():
        return settings.COMPILER_BASE_PATH

    @staticmethod
    def run_compiler(compile_cmd: str, input_path: Path, output_path: Path, compiler_path: Path, cc_flags: str):
        compile_command = "set -o pipefail; " +  compile_cmd \
            .replace("$INPUT", str(input_path)) \
            .replace("$OUTPUT", str(output_path)) \
            .replace("$COMPILER_PATH", str(compiler_path)) \
            .replace("$CC_FLAGS", cc_flags)
        compile_command = f"bash -c \"{compile_command}\""

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
    def run_assembler(assemble_cmd: str, input_path: Path, output_path: Path, compiler_path: Path, as_flags: str):
        assemble_command = "set -o pipefail; " + assemble_cmd \
            .replace("$INPUT", str(input_path)) \
            .replace("$OUTPUT", str(output_path)) \
            .replace("$COMPILER_PATH", str(compiler_path)) \
            .replace("$CC_FLAGS", as_flags)
        assemble_command = f"bash -c \"{assemble_command}\""
        
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
    def compile_code(compiler_config: CompilerConfiguration, code: str, context: str):
        compiler: Compiler = compiler_config.compiler

        compiler_path = CompilerWrapper.base_path() / compiler.shortname

        if not compiler_path.exists():
            logger.error(f"Compiler {compiler.shortname} not found")
            return (None, "ERROR: Compiler not found")

        temp_name = get_random_string(length=8)
        compilation_objects_path().mkdir(exist_ok=True, parents=True)
        code_path = compilation_objects_path() / (temp_name + ".c")
        object_path = compilation_objects_path() / (temp_name + ".o")

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
            compiler_config.cc_flags
        )

        os.remove(code_path)

        # Compilation failed
        if compile_status != 0:
            if object_path.exists():
                os.remove(object_path)
            return (None, stderr)
        
        # Store Compilation to db
        compilation = Compilation(compiler_config=compiler_config, source_code=code, context=context, object=object_path)
        compilation.save()

        return (compilation, stderr)

    @staticmethod
    def assemble_asm(compiler_config: CompilerConfiguration, asm: Asm) -> Assembly:
        compiler: Compiler = compiler_config.compiler

        compiler_path = CompilerWrapper.base_path() / compiler.shortname

        if not compiler_path.exists():
            logger.error(f"Compiler {compiler.shortname} not found")
            return "ERROR: Compiler not found"
        
        assemblies_path = asm_objects_path()
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
            compiler_config.as_flags
        )

        os.remove(asm_path)

        # Assembly failed
        if assemble_status != 0:
            if object_path.exists():
                os.remove(object_path)
            return None #f"ERROR: {assemble_status[1]}"
        
        # Store Assembly to db
        assembly = Assembly(compiler_config=compiler_config, source_asm=asm, object=object_path)
        assembly.save()

        return assembly
