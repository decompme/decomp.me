import contextlib
import io
import logging

from m2c.main import parse_flags, run

from coreapp.flags import Language
from coreapp.compilers import Compiler, CompilerType

from coreapp.sandbox import Sandbox

logger = logging.getLogger(__name__)


class M2CError(Exception):
    pass


class M2CWrapper:
    @staticmethod
    def get_triple(compiler: Compiler, arch: str, language: Language) -> str:
        if "mipse" in arch:
            t_arch = "mipsel"
        elif "mips" in arch:
            t_arch = "mips"
        elif "ppc" in arch:
            t_arch = "ppc"
        else:
            raise M2CError(f"Unsupported arch '{arch}'")

        if compiler.type != CompilerType.OTHER:
            t_compiler = compiler.type.value
        else:
            raise M2CError(f"Unsupported compiler '{compiler}'")

        if language == Language.C:
            t_language = "c"
        elif language == Language.CXX:
            t_language = "c++"
        else:
            raise M2CError(f"Unsupported language `{language}`")

        return f"{t_arch}-{t_compiler}-{t_language}"

    @staticmethod
    def decompile(
        asm: str, context: str, compiler: Compiler, arch: str, language: Language
    ) -> str:
        with Sandbox() as sandbox:
            flags = ["--stop-on-error", "--pointer-style=left"]

            flags.append(f"--target={M2CWrapper.get_triple(compiler, arch, language)}")

            # Create temp asm file
            asm_path = sandbox.path / "asm.s"
            asm_path.write_text(asm)

            if context:
                # Create temp context file
                ctx_path = sandbox.path / "ctx.c"
                ctx_path.write_text(context)

                flags.append("--context")
                flags.append(str(ctx_path))

            flags.append(str(asm_path))
            options = parse_flags(flags)

            out_string = io.StringIO()
            with contextlib.redirect_stdout(out_string):
                returncode = run(options)

            out_text = out_string.getvalue()

            if returncode == 0:
                return out_text
            else:
                raise M2CError(out_text)
