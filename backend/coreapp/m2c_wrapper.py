import contextlib
import io
import logging
import os

from django.utils.crypto import get_random_string
from mips_to_c.src.main import parse_flags
from mips_to_c.src.main import run

logger = logging.getLogger(__name__)

class M2CWrapper:
    def decompile(c_code):
        # Create temp file
        temp_name = get_random_string(length=8) + ".s"
        with open(temp_name, "w") as f:
            f.write(c_code)

        flags = ["--stop-on-error"]
        flags.append(temp_name)

        options = parse_flags(flags)

        try:
            out_string = io.StringIO()
            with contextlib.redirect_stdout(out_string):
                returncode = run(options)
            out_text = out_string.getvalue()

            os.remove(temp_name)

            if returncode == 0:
                return out_text
            else:
                return None
        except Exception as e:
            # TODO actual exception handling?
            return None
