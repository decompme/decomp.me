import contextlib
import io
import logging

from m2c.main import parse_flags, run

from ..compilers import Compiler, CompilerType
from ..config import CromperConfig
from ..error import M2CError
from ..m2c_targets import resolve_m2c_target
from ..sandbox import Sandbox

logger = logging.getLogger(__name__)


class M2CWrapper:
    def __init__(self, config: CromperConfig):
        self.config = config

    @staticmethod
    def is_platform_supported(platform_id: str) -> bool:
        return resolve_m2c_target(platform_id, CompilerType.OTHER.value) is not None

    @staticmethod
    def get_triple(platform_id: str, compiler: Compiler) -> str:
        triple = resolve_m2c_target(platform_id, compiler.type.value)
        if triple is None:
            raise M2CError(f"Unsupported platform '{platform_id}'")
        return triple

    def decompile(
        self, asm: str, context: str, platform_id: str, compiler: Compiler
    ) -> str:
        with Sandbox(self.config) as sandbox:
            flags = ["--stop-on-error", "--pointer-style=left"]

            flags.append(f"--target={M2CWrapper.get_triple(platform_id, compiler)}")

            if platform_id == "gba" and "thumb_func_start" in asm:
                asm = f".syntax unified\n{asm}"

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
