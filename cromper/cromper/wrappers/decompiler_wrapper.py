import logging

from .m2c_wrapper import M2CError, M2CWrapper
from ..compilers import Compiler
from ..platforms import Platform

logger = logging.getLogger(__name__)

MAX_M2C_ASM_LINES = 15000

DECOMP_WITH_CONTEXT_FAILED_PREAMBLE = "/* Decompilation with context failed; here's the decompilation without context: */\n"


class DecompilerWrapper:
    def __init__(self, **sandbox_kwargs):
        self.m2c_wrapper = M2CWrapper(**sandbox_kwargs)

    def decompile(
        self,
        default_source_code: str,
        platform: Platform,
        asm: str,
        context: str,
        compiler: Compiler,
    ) -> str:
        ret = default_source_code
        if platform.arch in ["mips", "mipsee", "mipsel", "mipsel:4000", "ppc", "arm32"]:
            if len(asm.splitlines()) > MAX_M2C_ASM_LINES:
                return "/* Too many lines to decompile; please run m2c manually */"
            try:
                ret = self.m2c_wrapper.decompile(asm, context, compiler, platform.arch)
            except M2CError as e:
                # Attempt to decompile the source without context as a last-ditch effort
                try:
                    ret = self.m2c_wrapper.decompile(asm, "", compiler, platform.arch)
                    ret = f"{e}\n{DECOMP_WITH_CONTEXT_FAILED_PREAMBLE}\n{ret}"
                except M2CError as e:
                    ret = f"{e}\n{default_source_code}"
            except Exception:
                logger.exception("Error running m2c")
                ret = f"/* Internal error while running m2c */\n{default_source_code}"
        else:
            ret = f"/* No decompiler yet implemented for {platform.arch} */\n{default_source_code}"

        return ret
