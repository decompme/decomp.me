import contextlib
import io
import logging

from m2c.main import parse_flags, run

from coreapp.compilers import Compiler, CompilerType

from coreapp.sandbox import Sandbox

logger = logging.getLogger(__name__)


class M2CError(Exception):
    pass


PLATFORM_ID_TO_M2C_ARCH = {
    # mips
    "irix": "mips",
    "n64": "mips",
    "ps1": "mipsel",
    "ps2": "mipsee",
    "psp": "mipsel",
    # ppc
    "wiiu": "ppc",
    "gc_wii": "ppc",
    "macosx": "ppc",
    # arm
    "gba": "gba",
    "n3ds": "arm",
    "nds_arm9": "arm",
}


class M2CWrapper:
    @staticmethod
    def is_platform_supported(platform_id: str) -> bool:
        return platform_id in PLATFORM_ID_TO_M2C_ARCH

    @staticmethod
    def get_triple(platform_id: str, compiler: Compiler) -> str:
        try:
            triple = PLATFORM_ID_TO_M2C_ARCH[platform_id]
        except KeyError:
            raise M2CError(f"Unsupported platform '{platform_id}'")

        if compiler.type != CompilerType.OTHER:
            triple += f"-{compiler.type.value}"

        return triple

    @staticmethod
    def decompile(asm: str, context: str, platform_id: str, compiler: Compiler) -> str:
        with Sandbox() as sandbox:
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
