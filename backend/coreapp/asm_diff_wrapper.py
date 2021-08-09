from coreapp import compiler_wrapper
import subprocess
from coreapp.models import Assembly, Compilation
import logging
from tempfile import NamedTemporaryFile

from asm_differ.diff import AARCH64_SETTINGS, MIPS_SETTINGS, PPC_SETTINGS, Config, Display, HtmlFormatter, restrict_to_function

logger = logging.getLogger(__name__)

MAX_FUNC_SIZE_LINES = 5000

class AsmDifferWrapper:
    @staticmethod
    def create_config(arch) -> Config:
        return Config(
            arch=arch,
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
    def run_objdump(target_data: bytes, config: Config) -> str:
        flags = ["-drz"]
        restrict = None # todo maybe restrict

        with NamedTemporaryFile() as target_file:
            target_file.write(target_data)
            target_file.flush()

            try:
                out = subprocess.run(
                    ["mips-linux-gnu-objdump"] + config.arch.arch_flags + flags + [target_file.name],
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
        compiler = compiler_wrapper.compilers[compilation.compiler]

        if compiler.arch == "mips":
            arch = MIPS_SETTINGS
        elif compiler.arch == "aarch64":
            arch = AARCH64_SETTINGS
        elif compiler.arch == "ppc":
            arch = PPC_SETTINGS
        else:
            logger.error("Unsupported arch: " + compiler.arch + ". Continuing assuming mips")
            arch = MIPS_SETTINGS
            
        config = AsmDifferWrapper.create_config(arch)
        
        # Re-generate the target asm if it doesn't exist
        if not target_assembly.object.exists():
            compiler_wrapper.CompilerWrapper.assemble_asm(compilation.compiler, compilation.as_opts, target_assembly.source_asm, target_assembly)

        basedump = AsmDifferWrapper.run_objdump(target_assembly.elf_object, config)
        mydump = AsmDifferWrapper.run_objdump(compilation.elf_object, config)

        # Remove first few junk lines from objdump output
        basedump = "\n".join(basedump.split("\n")[6:])
        mydump = "\n".join(mydump.split("\n")[6:])

        display = Display(basedump, mydump, config)

        return display.run_diff()
