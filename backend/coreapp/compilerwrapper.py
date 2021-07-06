from coreapp.models import Compiler, CompilerConfiguration
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
    def compile_code(compiler_config: CompilerConfiguration, code: str):
        CompilerWrapper.initialize_base_path()

        compiler: Compiler = compiler_config.compiler

        compiler_path = CompilerWrapper.base_path / compiler.shortname

        if not compiler_path.exists():
            logger.error(f"Compiler {compiler.shortname} not found")
            return "ERROR: Compiler not found"
        
        temp_name = get_random_string(length=8)
        temp_c_file = CompilerWrapper.base_path / (temp_name + ".txt")
        temp_o_file = CompilerWrapper.base_path / (temp_name + ".o")

        with open(temp_c_file, "w", newline="\n") as f:
            f.write(code)

        compile_command = compiler.compile_cmd
        compile_command = compile_command.replace("$INPUT", str(temp_c_file))
        compile_command = compile_command.replace("$OUTPUT", str(temp_o_file))
        compile_command = compile_command.replace("$COMPILER_PATH", str(compiler_path))
        compile_command = compile_command.replace("$CC_FLAGS", compiler_config.flags)
        
        objdump_command = "mips-linux-gnu-objdump -drz -j .text " + str(temp_o_file)

        # Run compiler
        try:
            logger.debug(f"Compiling: {compile_command}")
            result = subprocess.run(compile_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
            
            logger.debug(f"test123")
            if result.returncode != 0:
                logger.error(result.stderr.decode())
                return "ERROR: Could not run compiler"
        except Exception as e:
            os.remove(temp_c_file)
            logger.error(e)
            return "ERROR: Could not run compiler"
        
        if not temp_o_file.exists():
            os.remove(temp_c_file)
            logger.error(f"Compiled object does not exist: {temp_o_file}")
            return "ERROR: Compiled object does not exist"

        # Run objdump
        try:
            logger.debug(f"Objdumping: {objdump_command}")
            result = subprocess.run(objdump_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)

            if result.returncode != 0:
                logger.error(result.stderr.decode())
                os.remove(temp_c_file)
                os.remove(temp_o_file)
                return "ERROR: Could not run objdump"

            output = result.stdout.decode()
        except Exception as e:
            os.remove(temp_c_file)
            os.remove(temp_o_file)
            logger.error(e)
            return "ERROR: Could not run objdump"

        os.remove(temp_c_file)
        os.remove(temp_o_file)

        return output
