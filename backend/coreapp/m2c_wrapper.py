import contextlib
import io
import logging
import os

from django.utils.crypto import get_random_string
from mips_to_c.src.main import parse_flags
from mips_to_c.src.main import run
from coreapp.sandbox_wrapper import SandboxWrapper

logger = logging.getLogger(__name__)

class M2CWrapper:
    def decompile(asm, context):
        random_id = get_random_string(length=8)

        with SandboxWrapper() as sandbox:
            # Create temp asm file
            asm_path = sandbox.path / "asm.s"
            asm_path.write_text(asm)

            flags = ["--stop-on-error"]

            if context:
                # Create temp context file
                ctx_path = sandbox.path / "ctx.c"
                ctx_path.write_text(context)

                flags.append("--context")
                flags.append(str(ctx_path))

            flags.append(str(asm_path))
            options = parse_flags(flags)

            try:
                out_string = io.StringIO()
                with contextlib.redirect_stdout(out_string):
                    returncode = run(options)
                out_text = out_string.getvalue()

                if returncode == 0:
                    return out_text
                else:
                    return None
            except Exception as e:
                # TODO actual exception handling?
                return None
