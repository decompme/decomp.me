from coreapp import compiler_wrapper
from coreapp.models import Assembly, Compilation
from coreapp.sandbox import Sandbox
from coreapp.compiler_wrapper import PATH
from typing import Any, Dict, Optional
import json
import logging
import subprocess

import asm_differ.diff as asm_differ

logger = logging.getLogger(__name__)

MAX_FUNC_SIZE_LINES = 5000

class AsmDifferWrapper:
    @staticmethod
    def create_config(arch: asm_differ.ArchSettings) -> asm_differ.Config:
        return asm_differ.Config(
            arch=arch,
            # Build/objdump options
            diff_obj=True,
            make=False,
            source_old_binutils=True,
            inlines=False,
            max_function_size_lines=MAX_FUNC_SIZE_LINES,
            max_function_size_bytes=MAX_FUNC_SIZE_LINES * 4,
            # Display options
            formatter=asm_differ.JsonFormatter(arch_str=arch.name),
            threeway=None,
            base_shift=0,
            skip_lines=0,
            compress=None,
            show_branches=True,
            show_line_numbers=False,
            show_source=False,
            stop_jrra=False,
            ignore_large_imms=False,
            ignore_addr_diffs=False,
            algorithm="levenshtein",
        )

    @staticmethod
    def run_objdump(target_data: bytes, config: asm_differ.Config, label: Optional[str]) -> Optional[str]:
        flags = [
            "--disassemble",
            "--disassemble-zeroes",
            "--line-numbers",
            "--reloc",
        ]

        with Sandbox() as sandbox:
            target_path = sandbox.path / "out.s"
            target_path.write_bytes(target_data)

            start_addr = 0

            if label:
                nm_command = compiler_wrapper.get_nm_command(config.arch.name)

                if nm_command:
                    try:
                        nm_proc = sandbox.run_subprocess(
                            [nm_command] + [sandbox.rewrite_path(target_path)],
                            shell=True,
                            env={
                                "PATH": PATH,
                            },
                        )
                    except subprocess.CalledProcessError as e:
                        logger.error(f"Error running nm: {e}")
                        logger.error(e.stderr)

                    if nm_proc.stdout:
                        for line in nm_proc.stdout.splitlines():
                            if label in line:
                                start_addr = int(line.split()[0], 16)
                                break
                else:
                    logger.error(f"No nm command for {config.arch.name}")

            flags.append(f"--start-address={start_addr}")

            objdump_command = compiler_wrapper.get_objdump_command(config.arch.name)

            if objdump_command:
                try:
                    objdump_proc = sandbox.run_subprocess(
                        [objdump_command] + config.arch.arch_flags + flags + [sandbox.rewrite_path(target_path)],
                        shell=True,
                        env={
                            "PATH": PATH,
                        },
                    )
                except subprocess.CalledProcessError as e:
                    logger.error(e)
                    logger.error(e.stderr)
                    return None
            else:
                logger.error(f"No objdump command for {config.arch.name}")
                return None

        out = objdump_proc.stdout
        return out

    @staticmethod
    def diff(target_assembly: Assembly, compilation: Compilation, diff_label:Optional[str]) -> Dict[str, Any]:
        compiler_arch = compiler_wrapper.CompilerWrapper.arch_from_compiler(compilation.compiler)
        try:
            arch = asm_differ.get_arch(compiler_arch or "")
        except ValueError:
            logger.error(f"Unsupported arch: {compiler_arch}. Continuing assuming mips")
            arch = asm_differ.get_arch("mips")

        config = AsmDifferWrapper.create_config(arch)

        # Base
        if len(target_assembly.elf_object) == 0:
            logger.info("Base asm empty - attempting to regenerate")
            compiler_wrapper.CompilerWrapper.assemble_asm(arch.name, target_assembly.source_asm, target_assembly)
            if len(target_assembly.elf_object) == 0:
                logger.error("Regeneration of base-asm failed")
                return {"error": "Error: Base asm empty"}

        basedump = AsmDifferWrapper.run_objdump(target_assembly.elf_object, config, diff_label)
        if not basedump:
            return {"error": "Error running asm-differ on basedump"}

        # New
        if len(compilation.elf_object) == 0:
            logger.info("New asm empty - attempting to regenerate")
            compiler_wrapper.CompilerWrapper.compile_code(
                compilation.compiler,
                compilation.cc_opts or "",
                compilation.source_code,
                compilation.context,
                compilation
            )
            if len(compilation.elf_object) == 0:
                logger.error("Regeneration of new-asm failed")
                return {"error": "Error: New asm empty"}

        mydump = AsmDifferWrapper.run_objdump(compilation.elf_object, config, diff_label)
        if not mydump:
            return {"error": "Error running asm-differ on mydump"}

        # Preprocess the dumps
        basedump = asm_differ.preprocess_objdump_out(None, target_assembly.elf_object, basedump)
        mydump = asm_differ.preprocess_objdump_out(None, compilation.elf_object, mydump)

        display = asm_differ.Display(basedump, mydump, config)

        try:
            # TODO: It would be nice to get a python object from `run_diff()` to avoid the
            # JSON roundtrip. See https://github.com/simonlindholm/asm-differ/issues/56
            result = json.loads(display.run_diff()[0])
            result["error"] = None
        except Exception as e:
            logger.error(f"Error running asm-differ: {e}")
            return {"error": "Error running asm-differ"}

        return result
