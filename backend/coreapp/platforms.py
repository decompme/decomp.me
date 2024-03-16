import logging
from dataclasses import dataclass, field
from typing import Any, Dict, OrderedDict

from coreapp.flags import COMMON_DIFF_FLAGS, COMMON_MIPS_DIFF_FLAGS, Flags
from coreapp.models.preset import Preset
from coreapp.models.scratch import Scratch
from rest_framework.exceptions import APIException

from coreapp.serializers import PresetSerializer

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Platform:
    id: str
    name: str
    description: str
    arch: str
    assemble_cmd: str
    objdump_cmd: str
    nm_cmd: str
    asm_prelude: str
    diff_flags: Flags = field(default_factory=lambda: COMMON_DIFF_FLAGS, hash=False)
    supports_objdump_disassemble: bool = False  # TODO turn into objdump flag
    has_decompiler: bool = False

    def get_num_scratches(self) -> int:
        return Scratch.objects.filter(platform=self.id).count()

    def to_json(
        self, include_presets: bool = True, include_num_scratches: bool = False
    ) -> Dict[str, Any]:
        ret: Dict[str, Any] = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "arch": self.arch,
            "has_decompiler": self.has_decompiler,
        }
        if include_presets:
            ret["presets"] = [
                PresetSerializer(p).data
                for p in Preset.objects.filter(platform=self.id).order_by("name")
            ]
        if include_num_scratches:
            ret["num_scratches"] = self.get_num_scratches()
        return ret


def from_id(platform_id: str) -> Platform:
    if platform_id not in _platforms:
        raise APIException(f"Unknown platform: {platform_id}")
    return _platforms[platform_id]


DUMMY = Platform(
    id="dummy",
    name="Dummy System",
    description="DMY",
    arch="dummy",
    assemble_cmd='echo "assembled("$INPUT")" > "$OUTPUT"',
    objdump_cmd="echo",
    nm_cmd="echo",
    asm_prelude="",
)

MSDOS = Platform(
    id="msdos",
    name="Microsoft DOS",
    description="x86",
    arch="i686",
    assemble_cmd='jwasm -c -Fo"$OUTPUT" "$INPUT"',
    objdump_cmd="omf-objdump",
    nm_cmd="omf-nm",
    asm_prelude="""
        .386P
        .model FLAT
    """,
)

WIN32 = Platform(
    id="win32",
    name="Windows (9x/NT)",
    description="x86 (32bit)",
    arch="i686",
    assemble_cmd='i686-w64-mingw32-as --32 -mmnemonic=intel -msyntax=intel -mnaked-reg -o "$OUTPUT" "$INPUT"',
    objdump_cmd="i686-w64-mingw32-objdump",
    nm_cmd="i686-w64-mingw32-nm",
    asm_prelude="",
)

SWITCH = Platform(
    id="switch",
    name="Nintendo Switch",
    description="ARMv8-A",
    arch="aarch64",
    assemble_cmd='aarch64-linux-gnu-as -mcpu=cortex-a57+fp+simd+crypto+crc -o "$OUTPUT" "$INPUT"',
    objdump_cmd="aarch64-linux-gnu-objdump",
    nm_cmd="aarch64-linux-gnu-nm",
    asm_prelude="",
    supports_objdump_disassemble=True,
)

N64 = Platform(
    id="n64",
    name="Nintendo 64",
    description="MIPS (big-endian)",
    arch="mips",
    assemble_cmd='mips-linux-gnu-as -march=vr4300 -mabi=32 -o "$OUTPUT" "$INPUT"',
    objdump_cmd="mips-linux-gnu-objdump",
    nm_cmd="mips-linux-gnu-nm",
    diff_flags=COMMON_DIFF_FLAGS + COMMON_MIPS_DIFF_FLAGS,
    asm_prelude="""
.macro .late_rodata
    .section .rodata
.endm

.macro .late_rodata_alignment align
.endm

.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

.macro dlabel label
    .global \label
    \label:
.endm

.macro jlabel label
    \label:
.endm

.set noat
.set noreorder
.set gp=64

# Float register aliases (o32 ABI)

.set $fv0,          $f0
.set $fv0f,         $f1
.set $fv1,          $f2
.set $fv1f,         $f3
.set $ft0,          $f4
.set $ft0f,         $f5
.set $ft1,          $f6
.set $ft1f,         $f7
.set $ft2,          $f8
.set $ft2f,         $f9
.set $ft3,          $f10
.set $ft3f,         $f11
.set $fa0,          $f12
.set $fa0f,         $f13
.set $fa1,          $f14
.set $fa1f,         $f15
.set $ft4,          $f16
.set $ft4f,         $f17
.set $ft5,          $f18
.set $ft5f,         $f19
.set $fs0,          $f20
.set $fs0f,         $f21
.set $fs1,          $f22
.set $fs1f,         $f23
.set $fs2,          $f24
.set $fs2f,         $f25
.set $fs3,          $f26
.set $fs3f,         $f27
.set $fs4,          $f28
.set $fs4f,         $f29
.set $fs5,          $f30
.set $fs5f,         $f31

""",
    has_decompiler=True,
)

IRIX = Platform(
    id="irix",
    name="IRIX",
    description="MIPS (big-endian, PIC)",
    arch="mips",
    assemble_cmd='mips-linux-gnu-as -march=vr4300 -mabi=32 -KPIC -o "$OUTPUT" "$INPUT"',
    objdump_cmd="mips-linux-gnu-objdump",
    nm_cmd="mips-linux-gnu-nm",
    diff_flags=COMMON_DIFF_FLAGS + COMMON_MIPS_DIFF_FLAGS,
    asm_prelude="""
.macro .late_rodata
    .section .rodata
.endm

.macro .late_rodata_alignment align
.endm

.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

.macro dlabel label
    .global \label
    \label:
.endm

.macro jlabel label
    \label:
.endm

.set noat
.set noreorder
.set gp=64


# Float register aliases (o32 ABI)

.set $fv0,          $f0
.set $fv0f,         $f1
.set $fv1,          $f2
.set $fv1f,         $f3
.set $ft0,          $f4
.set $ft0f,         $f5
.set $ft1,          $f6
.set $ft1f,         $f7
.set $ft2,          $f8
.set $ft2f,         $f9
.set $ft3,          $f10
.set $ft3f,         $f11
.set $fa0,          $f12
.set $fa0f,         $f13
.set $fa1,          $f14
.set $fa1f,         $f15
.set $ft4,          $f16
.set $ft4f,         $f17
.set $ft5,          $f18
.set $ft5f,         $f19
.set $fs0,          $f20
.set $fs0f,         $f21
.set $fs1,          $f22
.set $fs1f,         $f23
.set $fs2,          $f24
.set $fs2f,         $f25
.set $fs3,          $f26
.set $fs3f,         $f27
.set $fs4,          $f28
.set $fs4f,         $f29
.set $fs5,          $f30
.set $fs5f,         $f31

""",
    has_decompiler=True,
)

PS1 = Platform(
    id="ps1",
    name="PlayStation",
    description="MIPS (little-endian)",
    arch="mipsel",
    assemble_cmd='mips-linux-gnu-as -EL -march=r3000 -mabi=32 -o "$OUTPUT" "$INPUT"',
    objdump_cmd="mips-linux-gnu-objdump",
    nm_cmd="mips-linux-gnu-nm",
    diff_flags=COMMON_DIFF_FLAGS + COMMON_MIPS_DIFF_FLAGS,
    asm_prelude="""
.macro .late_rodata
    .section .rodata
.endm

.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

.macro jlabel label
    \label:
.endm

.macro move a, b
	addu \\a, \\b, $zero
.endm

.set noat
.set noreorder

""",
    has_decompiler=True,
)

PSP = Platform(
    id="psp",
    name="PlayStation Portable",
    description="MIPS (little-endian)",
    arch="mipsel:4000",
    assemble_cmd='mips-linux-gnu-as -EL -march=r4000 -mabi=32 -o "$OUTPUT" "$INPUT"',
    objdump_cmd="mips-linux-gnu-objdump",
    nm_cmd="mips-linux-gnu-nm",
    diff_flags=COMMON_DIFF_FLAGS + COMMON_MIPS_DIFF_FLAGS,
    asm_prelude="""
.macro .late_rodata
    .section .rodata
.endm

.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

.macro jlabel label
    \label:
.endm

.set noat
.set noreorder

""",
    has_decompiler=True,
)

SATURN = Platform(
    id="saturn",
    name="Saturn",
    description="SH2 (big-endian)",
    arch="sh2",
    assemble_cmd='sh-elf-as --isa=sh2 --big -o "$OUTPUT" "$INPUT"',
    objdump_cmd="sh-elf-objdump",
    nm_cmd="sh-elf-nm",
    diff_flags=COMMON_DIFF_FLAGS,
    asm_prelude="""
.macro .late_rodata
    .section .rodata
.endm

.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

.macro jlabel label
    \label:
.endm

""",
)

PS2 = Platform(
    id="ps2",
    name="PlayStation 2",
    description="MIPS (little-endian)",
    arch="mipsee",
    assemble_cmd='mips-linux-gnu-as -march=r5900 -mabi=eabi -o "$OUTPUT" "$INPUT"',
    objdump_cmd="mips-linux-gnu-objdump",
    nm_cmd="mips-linux-gnu-nm",
    diff_flags=COMMON_DIFF_FLAGS + COMMON_MIPS_DIFF_FLAGS,
    asm_prelude="""
.macro .late_rodata
    .section .rodata
.endm

.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

.macro jlabel label
    \label:
.endm

.set noat
.set noreorder

""",
    has_decompiler=True,
)

MACOSX = Platform(
    id="macosx",
    name="Mac OS X",
    description="PowerPC",
    arch="ppc",
    assemble_cmd='powerpc-linux-gnu-as -o "$OUTPUT" "$INPUT"',
    objdump_cmd="powerpc-linux-gnu-objdump",
    nm_cmd="powerpc-linux-gnu-nm",
    asm_prelude="""
.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

.macro .fn name, visibility=global
    .\\visibility "\\name"
    .type "\\name", @function
    "\\name":
.endm

.macro .endfn name
    .size "\\name", . - "\\name"
.endm

.macro .obj name, visibility=global
    .\\visibility "\\name"
    .type "\\name", @object
    "\\name":
.endm

.macro .endobj name
    .size "\\name", . - "\\name"
.endm

.macro .sym name, visibility=global
    .\\visibility "\\name"
    "\\name":
.endm

.macro .endsym name
    .size "\\name", . - "\\name"
.endm

.macro .rel name, label
    .4byte "\\name" + ("\label" - "\\name")
.endm

.set r0, 0
.set r1, 1
.set r2, 2
.set r3, 3
.set r4, 4
.set r5, 5
.set r6, 6
.set r7, 7
.set r8, 8
.set r9, 9
.set r10, 10
.set r11, 11
.set r12, 12
.set r13, 13
.set r14, 14
.set r15, 15
.set r16, 16
.set r17, 17
.set r18, 18
.set r19, 19
.set r20, 20
.set r21, 21
.set r22, 22
.set r23, 23
.set r24, 24
.set r25, 25
.set r26, 26
.set r27, 27
.set r28, 28
.set r29, 29
.set r30, 30
.set r31, 31
.set f0, 0
.set f1, 1
.set f2, 2
.set f3, 3
.set f4, 4
.set f5, 5
.set f6, 6
.set f7, 7
.set f8, 8
.set f9, 9
.set f10, 10
.set f11, 11
.set f12, 12
.set f13, 13
.set f14, 14
.set f15, 15
.set f16, 16
.set f17, 17
.set f18, 18
.set f19, 19
.set f20, 20
.set f21, 21
.set f22, 22
.set f23, 23
.set f24, 24
.set f25, 25
.set f26, 26
.set f27, 27
.set f28, 28
.set f29, 29
.set f30, 30
.set f31, 31
.set qr0, 0
.set qr1, 1
.set qr2, 2
.set qr3, 3
.set qr4, 4
.set qr5, 5
.set qr6, 6
.set qr7, 7
""",
)

GC_WII = Platform(
    id="gc_wii",
    name="GameCube / Wii",
    description="PowerPC",
    arch="ppc",
    assemble_cmd='powerpc-eabi-as -mgekko -o "$OUTPUT" "$INPUT"',
    objdump_cmd="powerpc-eabi-objdump -M broadway",
    nm_cmd="powerpc-eabi-nm",
    asm_prelude="""
.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

.macro .fn name, visibility=global
    .\\visibility "\\name"
    .type "\\name", @function
    "\\name":
.endm

.macro .endfn name
    .size "\\name", . - "\\name"
.endm

.macro .obj name, visibility=global
    .\\visibility "\\name"
    .type "\\name", @object
    "\\name":
.endm

.macro .endobj name
    .size "\\name", . - "\\name"
.endm

.macro .sym name, visibility=global
    .\\visibility "\\name"
    "\\name":
.endm

.macro .endsym name
    .size "\\name", . - "\\name"
.endm

.macro .rel name, label
    .4byte "\\name" + ("\label" - "\\name")
.endm

.set r0, 0
.set r1, 1
.set r2, 2
.set r3, 3
.set r4, 4
.set r5, 5
.set r6, 6
.set r7, 7
.set r8, 8
.set r9, 9
.set r10, 10
.set r11, 11
.set r12, 12
.set r13, 13
.set r14, 14
.set r15, 15
.set r16, 16
.set r17, 17
.set r18, 18
.set r19, 19
.set r20, 20
.set r21, 21
.set r22, 22
.set r23, 23
.set r24, 24
.set r25, 25
.set r26, 26
.set r27, 27
.set r28, 28
.set r29, 29
.set r30, 30
.set r31, 31
.set f0, 0
.set f1, 1
.set f2, 2
.set f3, 3
.set f4, 4
.set f5, 5
.set f6, 6
.set f7, 7
.set f8, 8
.set f9, 9
.set f10, 10
.set f11, 11
.set f12, 12
.set f13, 13
.set f14, 14
.set f15, 15
.set f16, 16
.set f17, 17
.set f18, 18
.set f19, 19
.set f20, 20
.set f21, 21
.set f22, 22
.set f23, 23
.set f24, 24
.set f25, 25
.set f26, 26
.set f27, 27
.set f28, 28
.set f29, 29
.set f30, 30
.set f31, 31
.set qr0, 0
.set qr1, 1
.set qr2, 2
.set qr3, 3
.set qr4, 4
.set qr5, 5
.set qr6, 6
.set qr7, 7
.set cr0lt, 0
.set cr0gt, 1
.set cr0eq, 2
.set cr0un, 3
.set cr1lt, 4
.set cr1gt, 5
.set cr1eq, 6
.set cr1un, 7
.set cr2lt, 8
.set cr2gt, 9
.set cr2eq, 10
.set cr2un, 11
.set cr3lt, 12
.set cr3gt, 13
.set cr3eq, 14
.set cr3un, 15
.set cr4lt, 16
.set cr4gt, 17
.set cr4eq, 18
.set cr4un, 19
.set cr5lt, 20
.set cr5gt, 21
.set cr5eq, 22
.set cr5un, 23
.set cr6lt, 24
.set cr6gt, 25
.set cr6eq, 26
.set cr6un, 27
.set cr7lt, 28
.set cr7gt, 29
.set cr7eq, 30
.set cr7un, 31
""",
)

NDS_ARM9 = Platform(
    id="nds_arm9",
    name="Nintendo DS",
    description="ARMv5TE",
    arch="arm32",
    assemble_cmd='sed "$INPUT" -e "s/;/;@/" | arm-none-eabi-as -march=armv5te -mthumb -o "$OUTPUT"',
    objdump_cmd="arm-none-eabi-objdump",
    nm_cmd="arm-none-eabi-nm",
    asm_prelude="""
.macro glabel label
    .global \label
    .thumb
    \label:
.endm

.macro arm_func_start name
    .arm
    \\name:
.endm
.macro arm_func_end name
.endm
.macro thumb_func_start name
    .thumb
    \\name:
.endm
.macro non_word_aligned_thumb_func_start name
    .thumb
    \\name:
.endm
.macro thumb_func_end name
.endm
""",
)

GBA = Platform(
    id="gba",
    name="Game Boy Advance",
    description="ARMv4T",
    arch="arm32",
    assemble_cmd='sed "$INPUT" -e "s/;/;@/" | arm-none-eabi-as -mcpu=arm7tdmi -mthumb -o "$OUTPUT"',
    objdump_cmd="arm-none-eabi-objdump",
    nm_cmd="arm-none-eabi-nm",
    asm_prelude="""
.macro glabel label
    .global \label
    .thumb
    \label:
.endm

.macro arm_func_start name
	.align 2, 0
	.arm
.endm
.macro arm_func_end name
.endm
.macro thumb_func_start name
	.align 2, 0
	.thumb
    .syntax unified
.endm
.macro non_word_aligned_thumb_func_start name
	.thumb
    .syntax unified
.endm
.macro thumb_func_end name
.endm
""",
)

N3DS = Platform(
    id="n3ds",
    name="Nintendo 3DS",
    description="ARMv6K",
    arch="arm32",
    assemble_cmd='sed "$INPUT" -e "s/;/;@/" | arm-none-eabi-as -mfpu=vfpv2 -march=armv6k -o "$OUTPUT"',
    objdump_cmd="arm-none-eabi-objdump",
    nm_cmd="arm-none-eabi-nm",
    asm_prelude="",
)

_platforms: OrderedDict[str, Platform] = OrderedDict(
    {
        "dummy": DUMMY,
        "irix": IRIX,
        "n64": N64,
        "gc_wii": GC_WII,
        "switch": SWITCH,
        "gba": GBA,
        "nds_arm9": NDS_ARM9,
        "n3ds": N3DS,
        "ps1": PS1,
        "ps2": PS2,
        "psp": PSP,
        "saturn": SATURN,
        "macosx": MACOSX,
        "msdos": MSDOS,
        "win32": WIN32,
    }
)
