import unittest
from unittest.mock import patch

from coreapp.compiler_wrapper import CompilerWrapper
from coreapp.diff_wrapper import DiffWrapper
from coreapp.models.scratch import Asm, Assembly
from coreapp.platforms import (
    IRIX,
    N64,
    GC_WII,
    SWITCH,
    GBA,
    NDS_ARM9,
    N3DS,
    PS1,
    PS2,
    PSP,
    SATURN,
    DREAMCAST,
    MACOSX,
    MSDOS,
    WIIU,
    WIN32,
    XBOX360,
    ANDROID_X86,
    Platform,
    _platforms,
)


MIPS_ASM = """\
jr $ra
li $v0,1
"""

PPC_ASM = """\
blr
li 0,1
"""

X86_ASM = """\
mov $1, %eax
ret
"""

MSDOS_ASM = """\
.386
.model flat, stdcall
.code

_return_one PROC
    mov eax, 1
    ret
_return_one ENDP

END
"""

ARM_ASM = """\
mov r0, #0
bx lr
"""

AARCH64_ASM = """\
mov x0, #0
ret
"""

SH2_ASM = """\
rts
nop
"""


def assemble_asm(platform: Platform, asm_code: str) -> Assembly:
    asm = Asm(hash="fakehash", data=asm_code)
    with patch("coreapp.models.scratch.Assembly.save", autospec=True):
        asm_obj = CompilerWrapper.assemble_asm(platform, asm)
    return asm_obj


def disassemble_obj(platform: Platform, asm_obj_bytes: bytes) -> str:
    objdump = DiffWrapper.run_objdump(asm_obj_bytes, platform, (), "", ())
    return objdump


class PlatformAssembleRoundtripTests(unittest.TestCase):
    PLATFORM_ASM_MAP = {
        # MIPS
        "irix": (IRIX, MIPS_ASM),
        "n64": (N64, MIPS_ASM),
        "ps1": (PS1, MIPS_ASM),
        "ps2": (PS2, MIPS_ASM),
        "psp": (PSP, MIPS_ASM),
        # PowerPC
        "macosx": (MACOSX, PPC_ASM),
        "gc_wii": (GC_WII, PPC_ASM),
        "wiiu": (WIIU, PPC_ASM),
        "xbox360": (XBOX360, PPC_ASM),
        # x86 family
        "msdos": (MSDOS, MSDOS_ASM),
        "win32": (WIN32, X86_ASM),
        "android_x86": (ANDROID_X86, X86_ASM),
        # ARM / AArch64
        "gba": (GBA, ARM_ASM),
        "nds_arm9": (NDS_ARM9, ARM_ASM),
        "n3ds": (N3DS, ARM_ASM),
        "switch": (SWITCH, AARCH64_ASM),
        # SH2
        "saturn": (SATURN, SH2_ASM),
        "dreamcast": (DREAMCAST, SH2_ASM),
    }

    def test_all_platforms_roundtrip(self) -> None:
        for platform_name in _platforms:
            if platform_name == "dummy":
                continue

            if platform_name not in self.PLATFORM_ASM_MAP:
                self.fail(f"No test found for {platform_name}")

            (platform, asm_code) = self.PLATFORM_ASM_MAP[platform_name]

            with self.subTest(platform=platform_name):
                try:
                    asm_obj = assemble_asm(platform, asm_code)
                    dump = disassemble_obj(platform, asm_obj.elf_object)
                    self.assertIsNotNone(
                        dump, f"Disassembly for {platform_name} was None"
                    )
                except Exception as e:
                    self.fail(f"Failed for {platform_name}: {e}")
