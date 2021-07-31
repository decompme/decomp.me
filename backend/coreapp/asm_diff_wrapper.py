import subprocess
from coreapp.models import Assembly, Compilation
import logging
from pathlib import Path

from asm_differ.diff import Config, Display, HtmlFormatter, MIPS_SETTINGS, create_config, restrict_to_function

logger = logging.getLogger(__name__)

MAX_FUNC_SIZE_LINES = 5000

class AsmDifferWrapper:
    @staticmethod
    def create_config(scratch_arch) -> Config:
        return Config(
            arch=scratch_arch,
            # Build/objdump options
            diff_obj=True,
            make=False,
            source=False,
            source_old_binutils=False,
            inlines=False,
            max_function_size_lines=MAX_FUNC_SIZE_LINES,
            max_function_size_bytes=MAX_FUNC_SIZE_LINES * 4,
            # Display options
            formatter=HtmlFormatter(),
            threeway=False,
            base_shift=0,
            skip_lines=0,
            show_branches=True,
            stop_jrra=False,
            ignore_large_imms=False,
            ignore_addr_diffs=False,
            algorithm="levenshtein",
        )

    @staticmethod
    def run_objdump(target: Path, config: Config) -> str:
        flags = ["-drz"]
        target = target
        restrict = None # todo maybe restrict

        try:
            out = subprocess.run(
                ["mips-linux-gnu-objdump"] + config.arch.arch_flags + flags + [target],
                check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                universal_newlines=True,
            ).stdout
        except subprocess.CalledProcessError as e:
            logger.error(e.stdout)
            logger.error(e.stderr)
            raise e

        if restrict is not None:
            return restrict_to_function(out, restrict, config)
        return out

    def diff(target_assembly: Assembly, compilation: Compilation):
        config = AsmDifferWrapper.create_config(MIPS_SETTINGS) # todo read arch from compiler config of compilation
        basedump = AsmDifferWrapper.run_objdump(target_assembly.object, config)
        mydump = AsmDifferWrapper.run_objdump(compilation.object, config)
        display = Display(basedump, mydump, config)

        return display.run_diff()
