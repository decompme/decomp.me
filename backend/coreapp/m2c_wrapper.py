import contextlib
import io
import logging

from m2c.main import parse_flags, run

from coreapp.compilers import Compiler, CompilerType

from coreapp.sandbox import Sandbox

logger = logging.getLogger(__name__)


class M2CError(Exception):
    pass


class M2CWrapper:
    @staticmethod
    def get_triple(compiler: Compiler, arch: str) -> str:
        if "mipsee" in arch:
            triple = "mipsee"
        elif "mipsel" in arch:
            triple = "mipsel"
        elif "mips" in arch:
            triple = "mips"
        elif "ppc" in arch:
            triple = "ppc"
        elif "arm32" in arch:
            triple = "arm"
        else:
            raise M2CError(f"Unsupported arch '{arch}'")

        if compiler.type != CompilerType.OTHER:
            triple += f"-{compiler.type.value}"
        else:
            raise M2CError(f"Unsupported compiler '{compiler}'")

        return triple

    @staticmethod
    def decompile(asm: str, context: str, compiler: Compiler, arch: str) -> str:
        with Sandbox() as sandbox:
            flags = ["--stop-on-error", "--pointer-style=left"]

            flags.append(f"--target={M2CWrapper.get_triple(compiler, arch)}")

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
