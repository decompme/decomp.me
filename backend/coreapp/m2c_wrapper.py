import contextlib
import io
import logging
import os

from django.utils.crypto import get_random_string
from mips_to_c.src.main import parse_flags
from mips_to_c.src.main import run

logger = logging.getLogger(__name__)

class M2CWrapper:
    def decompile(asm, context):
        random_id = get_random_string(length=8)

        # Create temp asm file
        asm_temp_name = random_id + ".s"
        with open(asm_temp_name, "w") as f:
            f.write(asm)

        flags = ["--stop-on-error"]

        if context:
            # Create temp context file
            ctx_temp_name = random_id + ".c"
            with open(ctx_temp_name, "w") as f:
                f.write(context)

            flags.append("--context")
            flags.append(ctx_temp_name)

        flags.append(asm_temp_name)

        options = parse_flags(flags)

        try:
            out_string = io.StringIO()
            with contextlib.redirect_stdout(out_string):
                returncode = run(options)
            out_text = out_string.getvalue()

            os.remove(asm_temp_name)
            if context:
                os.remove(ctx_temp_name)

            if returncode == 0:
                return out_text
            else:
                return None
        except Exception as e:
            # TODO actual exception handling?
            return None
