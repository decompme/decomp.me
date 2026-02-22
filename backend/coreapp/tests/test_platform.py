import unittest
from unittest.mock import patch

from coreapp.compiler_wrapper import CompilerWrapper
from coreapp.diff_wrapper import DiffWrapper
from coreapp.models.scratch import Asm, Assembly
from coreapp.platforms import (
    ANDROID_X86,
    DREAMCAST,
    GBA,
    GC_WII,
    MACOSX,
    MSDOS,
    N3DS,
    N64,
    NDS_ARM9,
    PS1,
    PS2,
    PSP,
    SATURN,
    SWITCH,
    WIIU,
    WIN32,
    XBOX360,
    _platforms,
    Platform,
    IRIX,
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
        IRIX: MIPS_ASM,
        N64: MIPS_ASM,
        PS1: MIPS_ASM,
        PS2: MIPS_ASM,
        PSP: MIPS_ASM,
        # PowerPC
        MACOSX: PPC_ASM,
        GC_WII: PPC_ASM,
        WIIU: PPC_ASM,
        XBOX360: PPC_ASM,
        # x86 family
        MSDOS: MSDOS_ASM,
        WIN32: X86_ASM,
        ANDROID_X86: X86_ASM,
        # ARM / AArch64
        GBA: ARM_ASM,
        NDS_ARM9: ARM_ASM,
        N3DS: ARM_ASM,
        SWITCH: AARCH64_ASM,
        # SH2
        SATURN: SH2_ASM,
        DREAMCAST: SH2_ASM,
    }

    @classmethod
    def setUpClass(cls) -> None:
        missing = [
            p.id
            for p in _platforms.values()
            if p.id != "dummy" and p not in cls.PLATFORM_ASM_MAP
        ]
        if missing:
            raise AssertionError(f"Missing ASM definitions for: {missing}")

    def test_all_platforms_roundtrip(self) -> None:
        for platform, asm_code in self.PLATFORM_ASM_MAP.items():
            with self.subTest(platform=platform.id):
                try:
                    asm_obj = assemble_asm(platform, asm_code)
                    dump = disassemble_obj(platform, asm_obj.elf_object)
                    self.assertIsNotNone(
                        dump, f"Disassembly for {platform.id} was None"
                    )
                except Exception as e:
                    self.fail(f"Failed for {platform.id}: {e}")
