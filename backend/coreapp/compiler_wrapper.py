from coreapp.models import Asm, Assembly, Compilation, Compiler, CompilerConfiguration
from django.conf import settings
from django.utils.crypto import get_random_string
import logging
import os
from pathlib import Path
import shlex
import subprocess
from tempfile import NamedTemporaryFile

logger = logging.getLogger(__name__)

ASM_MACROS = """.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

"""

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
    def run_assembler(assemble_cmd: str, input_path: Path, output_path: Path, compiler_path: Path, as_flags: str):
        assemble_command = "set -o pipefail; " + assemble_cmd \
            .replace("$INPUT", str(input_path)) \
            .replace("$OUTPUT", str(output_path)) \
            .replace("$COMPILER_PATH", str(compiler_path)) \
            .replace("$CC_FLAGS", as_flags)
        
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
    def compile_code(compiler_config: CompilerConfiguration, code: str, context: str):
        compiler: Compiler = compiler_config.compiler

        compiler_path = CompilerWrapper.base_path() / compiler.shortname

        if not compiler_path.exists():
            logger.error(f"Compiler {compiler.shortname} not found")
            return (None, "ERROR: Compiler not found")

        with NamedTemporaryFile(mode="rb", suffix=".o") as object_file:
            with NamedTemporaryFile(mode="w", suffix=".c") as code_file:
                code_file.write('#line 1 "ctx.c"\n')
                code_file.write(context)
                code_file.write('\n')

                code_file.write('#line 1 "src.c"\n')
                code_file.write(code)
                code_file.write('\n')

                code_file.flush()

                # Run compiler
                compile_status, stderr = CompilerWrapper.run_compiler(
                    compiler.compile_cmd,
                    Path(code_file.name),
                    Path(object_file.name),
                    compiler_path,
                    compiler_config.cc_flags
                )

            # Compilation failed
            if compile_status != 0:
                return (None, stderr)

            # Store Compilation to db
            compilation = Compilation(compiler_config=compiler_config, source_code=code, context=context, elf_object=object_file.read())
            compilation.save()

            return (compilation, stderr)

    @staticmethod
    def assemble_asm(compiler_config: CompilerConfiguration, asm: Asm) -> Assembly:
        compiler: Compiler = compiler_config.compiler

        compiler_path = CompilerWrapper.base_path() / compiler.shortname

        if not compiler_path.exists():
            logger.error(f"Compiler {compiler.shortname} not found")
            return "ERROR: Compiler not found"
        
        with NamedTemporaryFile(mode="rb", suffix=".o") as object_file:
            with NamedTemporaryFile(mode="w", suffix=".s") as asm_file:
                asm_file.write(ASM_MACROS + asm.data)
                asm_file.flush()

                assemble_status, stderr = CompilerWrapper.run_assembler(
                    compiler.assemble_cmd,
                    Path(asm_file.name),
                    Path(object_file.name),
                    compiler_path,
                    compiler_config.as_flags
                )

            # Assembly failed
            if assemble_status != 0:
                return None #f"ERROR: {assemble_status[1]}"

            # Store Assembly to db
            assembly = Assembly(compiler_config=compiler_config, source_asm=asm, elf_object=object_file.read())
            assembly.save()

            return assembly
