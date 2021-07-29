from coreapp.models import Asm, Assembly, Compiler, CompilerConfiguration
from django.conf import settings
from django.utils.crypto import get_random_string
import logging
import os
from pathlib import Path
import subprocess
import sys

logger = logging.getLogger(__name__)

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

            stderr_lines = stderr.splitlines()
            for i, line in enumerate(stderr_lines):
                file_end = line.find(":")

                if file_end != -1:
                    stderr_lines[i] = "input.c" + line[file_end:].strip()
            
            stderr = "\n".join(stderr_lines)
            
            if result.returncode != 0:
                logger.error(result.stderr.decode())
                return_code = 1
        except Exception as e:
            logger.error(e)
            return_code = 2
        
        if not output_path.exists():
            logger.error(f"Compiled object does not exist: {str(output_path)}")
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
    def compile_code(compiler_config: CompilerConfiguration, code: str):
        compiler: Compiler = compiler_config.compiler

        compiler_path = CompilerWrapper.base_path() / compiler.shortname

        if not compiler_path.exists():
            logger.error(f"Compiler {compiler.shortname} not found")
            return "ERROR: Compiler not found"

        temp_name = get_random_string(length=8)
        code_path = CompilerWrapper.base_path() / (temp_name + ".c")
        object_path = CompilerWrapper.base_path() / (temp_name + ".o")

        with open(code_path, "w", newline="\n") as f:
            f.write(code)

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
            return ("", stderr)

        # Run objdump
        objdump_status, result = CompilerWrapper.run_objdump(object_path)

        if object_path.exists():
            os.remove(object_path)

        # Objdump failed
        if objdump_status != 0:
            return ("", f"ERROR: {result}")

        return (result, stderr)

    @staticmethod
    def assemble_asm(compiler_config: CompilerConfiguration, asm: Asm):
        compiler: Compiler = compiler_config.compiler

        compiler_path = CompilerWrapper.base_path() / compiler.shortname

        if not compiler_path.exists():
            logger.error(f"Compiler {compiler.shortname} not found")
            return "ERROR: Compiler not found"
        
        assemblies_path = CompilerWrapper.base_path() / "assemblies"
        os.path.mkdir(assemblies_path, exist_ok=True)
        
        temp_name = get_random_string(length=8)

        object_path = assemblies_path / (temp_name + ".o")

        assemble_status = CompilerWrapper.run_assembler(
            compiler.assemble_cmd,
            asm.data,
            object_path,
            compiler_path,
            compiler_config.as_flags
        )

        # Assembly failed
        if assemble_status[0] != 0:
            if object_path.exists():
                os.remove(object_path)
            return f"ERROR: {assemble_status[1]}"
        
        # Store Assembly to db
        assembly = Assembly(compiler_config=compiler_config, source_asm=asm, object=object_path)
        assembly.save()

        return assembly
