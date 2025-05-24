import logging
from typing import NamedTuple
from coreapp import compilers

from coreapp.compilers import Compiler

from coreapp.m2c_wrapper import M2CError, M2CWrapper
from coreapp.platforms import Platform

logger = logging.getLogger(__name__)

MAX_M2C_ASM_LINES = 15000

DECOMP_WITH_CONTEXT_FAILED_PREAMBLE = "/* Decompilation with context failed; here's the decompilation without context: */\n"


class DecompileRequest(NamedTuple):
    default_source_code: str
    platform: Platform
    asm: str
    context: str
    compiler: Compiler


class DecompilerWrapper:
    @staticmethod
    def decompile(
        default_source_code: str,
        platform: Platform,
        asm: str,
        context: str,
        compiler: Compiler,
    ) -> str:
        if compiler == compilers.DUMMY:
            return f"decompiled({asm})"

        ret = default_source_code
        if platform.arch in ["mips", "mipsee", "mipsel", "mipsel:4000", "ppc"]:
            if len(asm.splitlines()) > MAX_M2C_ASM_LINES:
                return "/* Too many lines to decompile; please run m2c manually */"
            try:
                ret = M2CWrapper.decompile(asm, context, compiler, platform.arch)
            except M2CError as e:
                # Attempt to decompile the source without context as a last-ditch effort
                try:
                    ret = M2CWrapper.decompile(asm, "", compiler, platform.arch)
                    ret = f"{e}\n{DECOMP_WITH_CONTEXT_FAILED_PREAMBLE}\n{ret}"
                except M2CError as e:
                    ret = f"{e}\n{default_source_code}"
            except Exception:
                logger.exception("Error running m2c")
                ret = f"/* Internal error while running m2c */\n{default_source_code}"
        else:
            ret = f"/* No decompiler yet implemented for {platform.arch} */\n{default_source_code}"

        return ret
