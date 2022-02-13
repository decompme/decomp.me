import contextlib
import io
import logging

from mips_to_c.src.main import parse_flags
from mips_to_c.src.main import run
from coreapp.sandbox import Sandbox

logger = logging.getLogger(__name__)

class M2CError(Exception):
    pass

class M2CWrapper:
    @staticmethod
    def decompile(asm: str, context: str, compiler: str) -> str:
        with Sandbox() as sandbox:
            flags = ["--stop-on-error", "--pointer-style=left"]

            # Create temp asm file
            asm_path = sandbox.path / "asm.s"
            asm_path.write_text(asm)

            if context:
                # Create temp context file
                ctx_path = sandbox.path / "ctx.c"
                ctx_path.write_text(context)

                flags.append("--context")
                flags.append(str(ctx_path))

            # TODO have compiler family as part of compiler obj
            if compiler in ["gcc2.8.1"]:
                flags.append("--compiler=gcc")

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
