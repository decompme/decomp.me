import os
import subprocess
import tempfile
from typing import List


def c_file_to_context(root_dir: str, in_file: str, cpp_flags: List[str]) -> str:
    in_file = os.path.relpath(in_file, root_dir)
    cpp_command = ["gcc", "-E", "-P", "-dM", *cpp_flags, in_file]
    cpp_command2 = ["gcc", "-E", "-P", *cpp_flags, in_file]

    with tempfile.NamedTemporaryFile(suffix=".c") as tmp:
        stock_macros = subprocess.check_output(
            ["gcc", "-E", "-P", "-dM", tmp.name], cwd=root_dir, encoding="utf-8"
        )

    out_text = ""
    out_text += subprocess.check_output(cpp_command, cwd=root_dir, encoding="utf-8")
    out_text += subprocess.check_output(cpp_command2, cwd=root_dir, encoding="utf-8")

    if not out_text:
        raise Exception("cpp output is empty")

    for line in stock_macros.strip().splitlines():
        out_text = out_text.replace(line + "\n", "")
    return out_text
