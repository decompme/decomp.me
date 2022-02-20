import logging

from coreapp.compiler_wrapper import CompilerWrapper
from coreapp.m2c_wrapper import M2CError, M2CWrapper

logger = logging.getLogger(__name__)


class DecompilerWrapper:
    @staticmethod
    def decompile(
        default_source_code: str, platform: str, asm: str, context: str, compiler: str
    ) -> str:
        if compiler == "dummy":
            return f"decompiled({asm})"

        ret = default_source_code
        arch = CompilerWrapper.arch_from_platform(platform)
        if arch in ["mips", "mipsel", "ppc"]:
            try:
                ret = M2CWrapper.decompile(asm, context, compiler, arch)
            except M2CError as e:
                ret = f"{e}\n{default_source_code}"
            except Exception:
                logger.exception("Error running mips_to_c")
                ret = f"/* Internal error while running mips_to_c */\n{default_source_code}"
        else:
            ret = (
                f"/* No decompiler yet implemented for {arch} */\n{default_source_code}"
            )

        return ret
