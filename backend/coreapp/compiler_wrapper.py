from coreapp.models import Assembly, Compiler, CompilerConfiguration
from django.utils.crypto import get_random_string
import logging
import os
from pathlib import Path
import subprocess
import sys

logger = logging.getLogger(__name__)

class CompilerWrapper:
    base_path = None

    def initialize_base_path():
        if CompilerWrapper.base_path:
            return

        if "COMPILER_BASE_PATH" not in os.environ:
            sys.exit("COMPILER_BASE_PATH not set")

        CompilerWrapper.base_path = Path(os.environ["COMPILER_BASE_PATH"]).resolve()

    @staticmethod
    def run_compiler(compile_cmd: str, input_path: Path, output_path: Path, compiler_path: Path, cc_flags: str):
        compile_command = compile_cmd \
            .replace("$INPUT", str(input_path)) \
            .replace("$OUTPUT", str(output_path)) \
            .replace("$COMPILER_PATH", str(compiler_path)) \
            .replace("$CC_FLAGS", cc_flags)

        logger.debug(f"Compiling: {compile_command}")

        try:
            result = subprocess.run(compile_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
            
            if result.returncode != 0:
                logger.error(result.stderr.decode())
                return (1, "Non-zero error code from compiler")
        except Exception as e:
            logger.error(e)
            return (2, "Exception while running compiler")
        
        if not output_path.exists():
            logger.error(f"Compiled object does not exist: {str(output_path)}")
            return (3, "Compiled object does not exist")

        return (0, )

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
    def compile_code(compiler_config: CompilerConfiguration, code: str, target_asm: Assembly=None):
        CompilerWrapper.initialize_base_path()

        compiler: Compiler = compiler_config.compiler

        compiler_path = CompilerWrapper.base_path / compiler.shortname

        if not compiler_path.exists():
            logger.error(f"Compiler {compiler.shortname} not found")
            return "ERROR: Compiler not found"

        temp_name = get_random_string(length=8)
        code_path = CompilerWrapper.base_path / (temp_name + ".txt")
        object_path = CompilerWrapper.base_path / (temp_name + ".o")

        with open(code_path, "w", newline="\n") as f:
            f.write(code)

        # Run compiler
        compile_status = CompilerWrapper.run_compiler(
            compiler.compile_cmd,
            code_path,
            object_path,
            compiler_path,
            compiler_config.cc_flags
        )

        os.remove(code_path)

        # Compilation failed
        if compile_status[0] != 0:
            if object_path.exists():
                os.remove(object_path)
            return f"ERROR: {compile_status[1]}"

        # Run objdump
        objdump_status = CompilerWrapper.run_objdump(object_path)

        if object_path.exists():
            os.remove(object_path)

        # Objdump failed
        if objdump_status[0] != 0:
            return f"ERROR: {objdump_status[1]}"

        return {
            "target_asm": target_asm.data,
            "compiled_asm": objdump_status[1],
        }
