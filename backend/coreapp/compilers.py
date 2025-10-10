import enum
import logging
import platform as platform_stdlib
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import ClassVar, List, Optional, OrderedDict

from coreapp import platforms
from coreapp.flags import (
    COMMON_ARMCC_FLAGS,
    COMMON_CLANG_FLAGS,
    COMMON_PRODG_GC_FLAGS,
    COMMON_SHC_FLAGS,
    COMMON_GCC_FLAGS,
    COMMON_GCC_PS1_FLAGS,
    COMMON_GCC_PS2_FLAGS,
    COMMON_GCC_SATURN_FLAGS,
    COMMON_IDO_FLAGS,
    COMMON_MSVC_FLAGS,
    COMMON_MWCC_NDS_ARM9_FLAGS,
    COMMON_MWCC_PS2_FLAGS,
    COMMON_MWCC_PSP_FLAGS,
    COMMON_MWCC_WII_GC_FLAGS,
    COMMON_WATCOM_FLAGS,
    COMMON_BORLAND_FLAGS,
    Flags,
    Language,
)
from coreapp.platforms import (
    GBA,
    GC_WII,
    IRIX,
    MACOSX,
    MSDOS,
    N3DS,
    N64,
    NDS_ARM9,
    PS1,
    PS2,
    PSP,
    SATURN,
    DREAMCAST,
    SWITCH,
    WIN32,
    Platform,
)
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)

CONFIG_PY = "config.py"
COMPILER_BASE_PATH: Path = settings.COMPILER_BASE_PATH


class CompilerType(enum.Enum):
    GCC = "gcc"
    IDO = "ido"
    MWCC = "mwcc"
    OTHER = "other"


@dataclass(frozen=True)
class Compiler:
    id: str
    cc: str
    platform: Platform
    flags: ClassVar[Flags]
    library_include_flag: str
    base_compiler: Optional["Compiler"] = None
    type: ClassVar[CompilerType] = CompilerType.OTHER
    language: Language = Language.C

    @property
    def path(self) -> Path:
        if self.base_compiler is not None:
            return (
                COMPILER_BASE_PATH
                / self.base_compiler.platform.id
                / self.base_compiler.id
            )
        return COMPILER_BASE_PATH / self.platform.id / self.id

    def available(self) -> bool:
        # consider compiler binaries present if the compiler's directory is found
        if not self.path.exists():
            print(f"Compiler {self.id} not found at {self.path}")
        return self.path.exists()


@dataclass(frozen=True)
class DummyCompiler(Compiler):
    flags: ClassVar[Flags] = []
    library_include_flag: str = ""

    def available(self) -> bool:
        return settings.DUMMY_COMPILER


@dataclass(frozen=True)
class DummyLongRunningCompiler(DummyCompiler):
    def available(self) -> bool:
        return settings.DUMMY_COMPILER and platform_stdlib.system() != "Windows"


@dataclass(frozen=True)
class ClangCompiler(Compiler):
    flags: ClassVar[Flags] = COMMON_CLANG_FLAGS
    library_include_flag: str = "-isystem"


@dataclass(frozen=True)
class ArmccCompiler(Compiler):
    flags: ClassVar[Flags] = COMMON_ARMCC_FLAGS
    library_include_flag: str = "-J"


@dataclass(frozen=True)
class SHCCompiler(Compiler):
    flags: ClassVar[Flags] = COMMON_SHC_FLAGS
    library_include_flag: str = ""


@dataclass(frozen=True)
class GCCCompiler(Compiler):
    type: ClassVar[CompilerType] = CompilerType.GCC
    flags: ClassVar[Flags] = COMMON_GCC_FLAGS
    library_include_flag: str = "-isystem"


@dataclass(frozen=True)
class GCCPS1Compiler(GCCCompiler):
    platform: Platform = PS1
    flags: ClassVar[Flags] = COMMON_GCC_PS1_FLAGS


@dataclass(frozen=True)
class GCCPS2Compiler(GCCCompiler):
    platform: Platform = PS2
    flags: ClassVar[Flags] = COMMON_GCC_PS2_FLAGS


@dataclass(frozen=True)
class GCCGCCompiler(GCCCompiler):
    platform: Platform = GC_WII
    flags: ClassVar[Flags] = COMMON_PRODG_GC_FLAGS


@dataclass(frozen=True)
class GCCSaturnCompiler(GCCCompiler):
    platform: Platform = SATURN
    flags: ClassVar[Flags] = COMMON_GCC_SATURN_FLAGS


@dataclass(frozen=True)
class IDOCompiler(Compiler):
    type: ClassVar[CompilerType] = CompilerType.IDO
    flags: ClassVar[Flags] = COMMON_IDO_FLAGS
    library_include_flag: str = "-I"


@dataclass(frozen=True)
class MWCCCompiler(Compiler):
    type: ClassVar[CompilerType] = CompilerType.MWCC


@dataclass(frozen=True)
class MWCCNDSArm9Compiler(MWCCCompiler):
    platform: Platform = NDS_ARM9
    flags: ClassVar[Flags] = COMMON_MWCC_NDS_ARM9_FLAGS
    library_include_flag: str = "-IZ:"


@dataclass(frozen=True)
class MWCCPS2Compiler(MWCCCompiler):
    platform: Platform = PS2
    flags: ClassVar[Flags] = COMMON_MWCC_PS2_FLAGS
    library_include_flag: str = "-IZ:"


@dataclass(frozen=True)
class MWCCPSPCompiler(MWCCCompiler):
    platform: Platform = PSP
    flags: ClassVar[Flags] = COMMON_MWCC_PSP_FLAGS
    library_include_flag: str = "-IZ:"


@dataclass(frozen=True)
class MWCCWiiGCCompiler(MWCCCompiler):
    platform: Platform = GC_WII
    flags: ClassVar[Flags] = COMMON_MWCC_WII_GC_FLAGS
    library_include_flag: str = "-IZ:"


@dataclass(frozen=True)
class MSVCCompiler(Compiler):
    flags: ClassVar[Flags] = COMMON_MSVC_FLAGS
    library_include_flag: str = "/IZ:"


@dataclass(frozen=True)
class WatcomCompiler(Compiler):
    flags: ClassVar[Flags] = COMMON_WATCOM_FLAGS
    library_include_flag: str = "/IZ:"


@dataclass(frozen=True)
class BorlandCompiler(Compiler):
    flags: ClassVar[Flags] = COMMON_BORLAND_FLAGS
    library_include_flag: str = ""


def from_id(compiler_id: str) -> Compiler:
    if compiler_id not in _compilers:
        raise APIException(
            f"Unknown compiler: {compiler_id}",
            str(status.HTTP_400_BAD_REQUEST),
        )
    return _compilers[compiler_id]


@cache
def available_compilers() -> List[Compiler]:
    return list(_compilers.values())


@cache
def available_platforms() -> List[Platform]:
    pset = set(compiler.platform for compiler in available_compilers())

    return sorted(pset, key=lambda p: p.name)


DUMMY = DummyCompiler(id="dummy", platform=platforms.DUMMY, cc="")

DUMMY_LONGRUNNING = DummyLongRunningCompiler(
    id="dummy_longrunning", platform=platforms.DUMMY, cc="sleep 3600"
)

# GBA
AGBCC = GCCCompiler(
    id="agbcc",
    platform=GBA,
    cc='/usr/bin/cpp -E -I "${COMPILER_DIR}"/include -iquote include -nostdinc -undef "$INPUT" | "${COMPILER_DIR}"/bin/agbcc $COMPILER_FLAGS -o - | arm-none-eabi-as -mcpu=arm7tdmi -o "$OUTPUT"',
)

OLD_AGBCC = GCCCompiler(
    id="old_agbcc",
    platform=GBA,
    cc='/usr/bin/cpp -E -I "${COMPILER_DIR}"/include -iquote include -nostdinc -undef "$INPUT" | "${COMPILER_DIR}"/bin/old_agbcc $COMPILER_FLAGS -o - | arm-none-eabi-as -mcpu=arm7tdmi -o "$OUTPUT"',
    base_compiler=AGBCC,
)

AGBCCPP = GCCCompiler(
    id="agbccpp",
    platform=GBA,
    cc='/usr/bin/cpp -E -I "${COMPILER_DIR}"/include -iquote include -nostdinc -undef "$INPUT" | "${COMPILER_DIR}"/bin/agbcp -quiet $COMPILER_FLAGS -o - | arm-none-eabi-as -mcpu=arm7tdmi -o "$OUTPUT"',
)
# N3DS
ARMCC_CC = '${WIBO} "${COMPILER_DIR}"/bin/armcc.exe -c --cpu=MPCore --fpmode=fast --apcs=/interwork -I "${COMPILER_DIR}"/include $COMPILER_FLAGS -o "${OUTPUT}" "${INPUT}"'

ARMCC_40_771 = ArmccCompiler(
    id="armcc_40_771",
    platform=N3DS,
    cc=ARMCC_CC,
)

ARMCC_40_821 = ArmccCompiler(
    id="armcc_40_821",
    platform=N3DS,
    cc=ARMCC_CC,
)

ARMCC_41_561 = ArmccCompiler(
    id="armcc_41_561",
    platform=N3DS,
    cc=ARMCC_CC,
)

ARMCC_41_713 = ArmccCompiler(
    id="armcc_41_713",
    platform=N3DS,
    cc=ARMCC_CC,
)

ARMCC_41_791 = ArmccCompiler(
    id="armcc_41_791",
    platform=N3DS,
    cc=ARMCC_CC,
)

ARMCC_41_894 = ArmccCompiler(
    id="armcc_41_894",
    platform=N3DS,
    cc=ARMCC_CC,
)

ARMCC_41_921 = ArmccCompiler(
    id="armcc_41_921",
    platform=N3DS,
    cc=ARMCC_CC,
)

ARMCC_41_1049 = ArmccCompiler(
    id="armcc_41_1049",
    platform=N3DS,
    cc=ARMCC_CC,
)

ARMCC_41_1440 = ArmccCompiler(
    id="armcc_41_1440",
    platform=N3DS,
    cc=ARMCC_CC,
)

ARMCC_41_1454 = ArmccCompiler(
    id="armcc_41_1454",
    platform=N3DS,
    cc=ARMCC_CC,
)

ARMCC_504_82 = ArmccCompiler(
    id="armcc_504_82",
    platform=N3DS,
    cc=ARMCC_CC,
)

# Switch
CLANG_391 = ClangCompiler(
    id="clang-3.9.1",
    platform=SWITCH,
    cc='TOOLROOT="$COMPILER_DIR" "$COMPILER_DIR"/bin/clang++ -c -target aarch64-linux-elf --sysroot="$COMPILER_DIR"/botw-lib-musl-25ed8669943bee65a650700d340e451eda2a26ba -D_LIBCPP_HAS_MUSL_LIBC -mcpu=cortex-a57+fp+simd+crypto+crc -mno-implicit-float -fstandalone-debug -fPIC -Wl,-Bsymbolic-functions -shared -stdlib=libc++ -nostdlib $COMPILER_FLAGS -o "$OUTPUT" "$INPUT"',
)

CLANG_401 = ClangCompiler(
    id="clang-4.0.1",
    platform=SWITCH,
    cc='TOOLROOT="$COMPILER_DIR" "$COMPILER_DIR"/bin/clang++ -c -target aarch64-linux-elf --sysroot="$COMPILER_DIR"/botw-lib-musl-25ed8669943bee65a650700d340e451eda2a26ba -mcpu=cortex-a57+fp+simd+crypto+crc -mno-implicit-float -fstandalone-debug -fPIC -Wl,-Bsymbolic-functions -shared -stdlib=libc++ -nostdlib $COMPILER_FLAGS -o "$OUTPUT" "$INPUT"',
)

CLANG_800 = ClangCompiler(
    id="clang-8.0.0",
    platform=SWITCH,
    cc='TOOLROOT="$COMPILER_DIR" "$COMPILER_DIR"/bin/clang++ -c -target aarch64-linux-elf --sysroot="$COMPILER_DIR"/botw-lib-musl-25ed8669943bee65a650700d340e451eda2a26ba -mcpu=cortex-a57+fp+simd+crypto+crc -mno-implicit-float -fstandalone-debug -fPIC -Wl,-Bsymbolic-functions -shared -stdlib=libc++ -nostdlib $COMPILER_FLAGS -o "$OUTPUT" "$INPUT"',
)

# PS1
PSYQ_COMPILE_BAT = "\r\n".join(
    [
        "@echo off",
        "SET TMPDIR=D:\\Temp",
        "CC1PSX.EXE -quiet ${COMPILER_FLAGS} D:\\dos_src.c -o D:\\output.s",
        "EXIT /B",
    ]
)
PSYQ_MSDOS_CC = (
    "echo \"\\$_hdimage = '+0 $(pwd) +1'\" > .dosemurc && "
    f'echo "{PSYQ_COMPILE_BAT}" >> COMPILE.BAT && '
    '/usr/bin/cpp -E "${INPUT}" | unix2dos > dos_src.c && '
    '(HOME=. /usr/bin/dosemu -f .dosemurc -quiet -dumb -K ${COMPILER_DIR} -E "D:\\COMPILE.BAT") && '
    '(HOME=. /usr/bin/dosemu -f .dosemurc -quiet -dumb -K ${COMPILER_DIR} -E "ASPSX.EXE -quiet D:\\output.s -o D:\\output.obj") && '
    '${COMPILER_DIR}/psyq-obj-parser output.obj -o "${OUTPUT}"'
)

PSYQ_CC = (
    '/usr/bin/cpp -P "${INPUT}" | unix2dos | '
    '${WIBO} ${COMPILER_DIR}/CC1PSX.EXE -quiet ${COMPILER_FLAGS} -o "${OUTPUT}".s && '
    '${WIBO} ${COMPILER_DIR}/ASPSX.EXE -quiet "${OUTPUT}".s -o "${OUTPUT}"bj && '
    '${COMPILER_DIR}/psyq-obj-parser "${OUTPUT}"bj -o "${OUTPUT}"'
)

PSYQ_263_221 = GCCPS1Compiler(
    id="psyq_263_221",
    cc=PSYQ_MSDOS_CC,
)

PSYQ33 = GCCPS1Compiler(
    id="psyq3.3",
    cc=PSYQ_MSDOS_CC,
)

PSYQ35 = GCCPS1Compiler(
    id="psyq3.5",
    cc=PSYQ_MSDOS_CC,
)

PSYQ36 = GCCPS1Compiler(
    id="psyq3.6",
    cc=PSYQ_MSDOS_CC,
)

PSYQ40 = GCCPS1Compiler(
    id="psyq4.0",
    cc=PSYQ_CC,
)

PSYQ43 = GCCPS1Compiler(
    id="psyq4.3",
    cc=PSYQ_CC,
)

PSYQ_CCPSX = (
    'echo "[ccpsx]" >> SN.INI && '
    'echo "compiler_path=${COMPILER_DIR//\\//\\\\}" >> SN.INI && '
    'echo "assembler_path=${COMPILER_DIR//\\//\\\\}" >> SN.INI && '
    'echo "tmpdir=/tmp" >> SN.INI && '
    'SN_PATH=. ${WINE} ${COMPILER_DIR}/CCPSX.EXE -v -c ${COMPILER_FLAGS} "${INPUT}" -o "${OUTPUT}bj" && '
    '${COMPILER_DIR}/psyq-obj-parser "${OUTPUT}"bj -o "${OUTPUT}"'
)

PSYQ41 = GCCPS1Compiler(
    id="psyq4.1",
    cc=PSYQ_CCPSX,
)

PSYQ44 = GCCPS1Compiler(
    id="psyq4.4",
    cc=PSYQ_CCPSX,
)

PSYQ45 = GCCPS1Compiler(
    id="psyq4.5",
    cc=PSYQ_CCPSX,
)

PSYQ46 = GCCPS1Compiler(
    id="psyq4.6",
    cc=PSYQ_CCPSX,
)

PS1_GCC = (
    '/usr/bin/cpp -E -lang-c -nostdinc "${INPUT}" -o "${INPUT}".i && '
    'eval "${COMPILER_DIR}/gcc ${COMPILER_FLAGS} -c -pipe -B${COMPILER_DIR}/ -o "${OUTPUT}" "${INPUT}".i"'
)

GCC257_PSX = GCCPS1Compiler(
    id="gcc2.5.7-psx",
    cc=PS1_GCC,
)

GCC260_PSX = GCCPS1Compiler(
    id="gcc2.6.0-psx",
    cc=PS1_GCC,
)

GCC263_PSX = GCCPS1Compiler(
    id="gcc2.6.3-psx",
    cc=PS1_GCC,
)

GCC272_PSX = GCCPS1Compiler(
    id="gcc2.7.2-psx",
    cc=PS1_GCC,
)

GCC280_PSX = GCCPS1Compiler(
    id="gcc2.8.0-psx",
    cc=PS1_GCC,
)

GCC281_PSX = GCCPS1Compiler(
    id="gcc2.8.1-psx",
    cc=PS1_GCC,
)

GCC29166_PSX = GCCPS1Compiler(
    id="gcc2.91.66-psx",
    cc=PS1_GCC,
)

GCC2952_PSX = GCCPS1Compiler(
    id="gcc2.95.2-psx",
    cc=PS1_GCC,
)

# these are "vanilla" compilers without direct PSYQ counterparts
GCC270_MIPSEL = GCCPS1Compiler(
    id="gcc2.7.0-mipsel",
    cc=PS1_GCC,
)

GCC271_MIPSEL = GCCPS1Compiler(
    id="gcc2.7.1-mipsel",
    cc=PS1_GCC,
)

GCC2721_MIPSEL = GCCPS1Compiler(
    id="gcc2.7.2.1-mipsel",
    cc=PS1_GCC,
)

GCC2722_MIPSEL = GCCPS1Compiler(
    id="gcc2.7.2.2-mipsel",
    cc=PS1_GCC,
)

GCC2723_MIPSEL = GCCPS1Compiler(
    id="gcc2.7.2.3-mipsel",
    cc=PS1_GCC,
)

# Saturn
SATURN_CC = (
    "echo \"\\$_hdimage = '+0 $(pwd) +1'\" > .dosemurc && "
    'cat "${INPUT}" | unix2dos > dos_src.c && '
    '(HOME="$(pwd)" /usr/bin/dosemu -quiet -dumb -f .dosemurc -K "${COMPILER_DIR}" -E "CPP.EXE D:\\dos_src.c -o D:\\src_proc.c") && '
    '(HOME="$(pwd)" /usr/bin/dosemu -quiet -dumb -f .dosemurc -K "${COMPILER_DIR}" -E "CC1.EXE -quiet ${COMPILER_FLAGS} D:\\src_proc.c -o D:\\output.s") && '
    '(HOME="$(pwd)" /usr/bin/dosemu -quiet -dumb -f .dosemurc -K "${COMPILER_DIR}" -E "AS.EXE D:\\output.s -o D:\\output.o") && '
    'sh-elf-objcopy -Icoff-sh -Oelf32-sh output.o "${OUTPUT}"'
)

CYGNUS_2_7_96Q3 = GCCSaturnCompiler(
    id="cygnus-2.7-96Q3",
    cc=SATURN_CC,
)

DREAMCAST_CC = (
    'cat "$INPUT" | unix2dos > dos_src.c && '
    "cp -r ${COMPILER_DIR}/bin/* . && "
    "(SHC_LIB=. SHC_TMP=. ${WINE} ${COMPILER_DIR}/bin/shc.exe dos_src.c ${COMPILER_FLAGS} -comment=nonest -cpu=sh4 -division=cpu -fpu=single -endian=little -extra=a=1800 -pic=0 -macsave=0 -sjis -string=const -aggressive=2 -object=dos_src.obj) && "
    "${WIBO} ${COMPILER_DIR}/bin/elfcnv.exe dos_src.obj ${OUTPUT}"
)

SHC_V51R11 = SHCCompiler(id="shc-v5.1r11", platform=DREAMCAST, cc=DREAMCAST_CC)

# PS2
IOP_GCC281 = GCCPS2Compiler(
    id="iop-gcc2.8.1",
    cc='"${COMPILER_DIR}"/bin/iop-gcc -c -B "${COMPILER_DIR}"/lib/gcc-lib/mipsel-scei-elfl/2.8.1/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

IOP_GCC2952_102 = GCCPS2Compiler(
    id="iop-gcc2.95.2-102",
    cc='${WINE} "${COMPILER_DIR}"/bin/iop-gcc.exe -c -B "${COMPILER_DIR}"/lib/gcc-lib/mipsel-scei-elfl/2.95.2/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC29_990721 = GCCPS2Compiler(
    id="ee-gcc2.9-990721",
    cc='"${COMPILER_DIR}"/bin/ee-gcc -c -B "${COMPILER_DIR}"/bin/ee- $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC29_991111 = GCCPS2Compiler(
    id="ee-gcc2.9-991111",
    cc='${COMPILER_DIR}/bin/ee-gcc -c $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC29_991111A = GCCPS2Compiler(
    id="ee-gcc2.9-991111a",
    cc='${COMPILER_DIR}/bin/ee-gcc -c $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC29_991111_01 = GCCPS2Compiler(
    id="ee-gcc2.9-991111-01",
    cc='${COMPILER_DIR}/bin/ee-gcc -c $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC29_991111_01_DTLS13010 = GCCPS2Compiler(
    id="ee-gcc2.9-991111-01-dtls13010",
    platform=PS2,
    cc='${COMPILER_DIR}/bin/ee-gcc -c $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC2952_273A = GCCPS2Compiler(
    id="ee-gcc2.95.2-273a",
    cc='${WINE} "${COMPILER_DIR}/bin/ee-gcc.exe" -c -B "${COMPILER_DIR}"/lib/gcc-lib/ee/2.95.2/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC2952_274 = GCCPS2Compiler(
    id="ee-gcc2.95.2-274",
    cc='${WINE} "${COMPILER_DIR}/bin/ee-gcc.exe" -c -B "${COMPILER_DIR}"/lib/gcc-lib/ee/2.95.2/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC2953_107 = GCCPS2Compiler(
    id="ee-gcc2.95.3-107",
    cc='${WINE} "${COMPILER_DIR}/bin/ee-gcc.exe" -c -B "${COMPILER_DIR}"/lib/gcc-lib/ee/2.95.3/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC2953_114 = GCCPS2Compiler(
    id="ee-gcc2.95.3-114",
    cc='${WINE} "${COMPILER_DIR}/bin/ee-gcc.exe" -c -B "${COMPILER_DIR}"/lib/gcc-lib/ee/2.95.3/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC2953_136 = GCCPS2Compiler(
    id="ee-gcc2.95.3-136",
    cc='${WINE} "${COMPILER_DIR}/bin/ee-gcc.exe" -c -B "${COMPILER_DIR}"/lib/gcc-lib/ee/2.95.3/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC296 = GCCPS2Compiler(
    id="ee-gcc2.96",
    cc='"${COMPILER_DIR}"/bin/ee-gcc -c -B "${COMPILER_DIR}"/bin/ee- $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC32_030210_BETA2 = GCCPS2Compiler(
    id="ee-gcc3.2-030210-beta2",
    cc='WINEPATH="${COMPILER_DIR}"/dll/ ${WINE} "${COMPILER_DIR}"/bin/ee-gcc.exe -c -B "${COMPILER_DIR}"/bin/ee- $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC32_030926 = GCCPS2Compiler(
    id="ee-gcc3.2-030926",
    cc='"${COMPILER_DIR}"/bin/ee-gcc -c -B "${COMPILER_DIR}"/bin/ee- $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC32_040921 = GCCPS2Compiler(
    id="ee-gcc3.2-040921",
    cc='"${COMPILER_DIR}"/bin/ee-gcc -c -B "${COMPILER_DIR}"/bin/ee- $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

MWCPS2_23_991202 = MWCCPS2Compiler(
    id="mwcps2-2.3-991202",
    cc='${WINE} "${COMPILER_DIR}/mwccmips.exe" -c $COMPILER_FLAGS -nostdinc -stderr "$INPUT" -o "$OUTPUT"',
)

MWCPS2_CC = '${WIBO} "${COMPILER_DIR}/mwccps2.exe" -c $COMPILER_FLAGS -nostdinc -stderr "$INPUT" -o "$OUTPUT"'

MWCPS2_233_000906 = MWCCPS2Compiler(
    id="mwcps2-2.3.3-000906",
    cc=MWCPS2_CC,
)

MWCPS2_24_001213 = MWCCPS2Compiler(
    id="mwcps2-2.4-001213",
    cc=MWCPS2_CC,
)

MWCPS2_30_011126 = MWCCPS2Compiler(
    id="mwcps2-3.0-011126",
    cc=MWCPS2_CC,
)

MWCPS2_301_020123 = MWCCPS2Compiler(
    id="mwcps2-3.0.1-020123",
    cc=MWCPS2_CC,
)

MWCPS2_303_020716 = MWCCPS2Compiler(
    id="mwcps2-3.0.3-020716",
    cc=MWCPS2_CC,
)

MWCPS2_30B22_020926 = MWCCPS2Compiler(
    id="mwcps2-3.0b22-020926",
    cc=MWCPS2_CC,
)

MWCPS2_30B38_030307 = MWCCPS2Compiler(
    id="mwcps2-3.0b38-030307",
    cc=MWCPS2_CC,
)

MWCPS2_30B50_030527 = MWCCPS2Compiler(
    id="mwcps2-3.0b50-030527",
    cc=MWCPS2_CC,
)

MWCPS2_30B52_030722 = MWCCPS2Compiler(
    id="mwcps2-3.0b52-030722",
    cc=MWCPS2_CC,
)

MWCPS2_301B44_030325 = MWCCPS2Compiler(
    id="mwcps2-3.0.1b44-030325",
    cc=MWCPS2_CC,
)

MWCPS2_301B51_030512 = MWCCPS2Compiler(
    id="mwcps2-3.0.1b51-030512",
    cc=MWCPS2_CC,
)

MWCPS2_301B74_030811 = MWCCPS2Compiler(
    id="mwcps2-3.0.1b74-030811",
    cc=MWCPS2_CC,
)

MWCPS2_301B75_030916 = MWCCPS2Compiler(
    id="mwcps2-3.0.1b75-030916",
    cc=MWCPS2_CC,
)

MWCPS2_301B87_031208 = MWCCPS2Compiler(
    id="mwcps2-3.0.1b87-031208",
    cc=MWCPS2_CC,
)

MWCPS2_301B95_040309 = MWCCPS2Compiler(
    id="mwcps2-3.0.1b95-040309",
    cc=MWCPS2_CC,
)

MWCPS2_301B103_040528 = MWCCPS2Compiler(
    id="mwcps2-3.0.1b103-040528",
    cc=MWCPS2_CC,
)

MWCPS2_301B119_040914 = MWCCPS2Compiler(
    id="mwcps2-3.0.1b119-040914",
    cc=MWCPS2_CC,
)

MWCPS2_301B145_050209 = MWCCPS2Compiler(
    id="mwcps2-3.0.1b145-050209",
    cc=MWCPS2_CC,
)

MWCPS2_301B151_050317 = MWCCPS2Compiler(
    id="mwcps2-3.0.1b151-050317",
    cc=MWCPS2_CC,
)

MWCPS2_301B198_051011 = MWCCPS2Compiler(
    id="mwcps2-3.0.1b198-051011",
    cc=MWCPS2_CC,
)

MWCPS2_301B205_051227 = MWCCPS2Compiler(
    id="mwcps2-3.0.1b205-051227",
    cc=MWCPS2_CC,
)

MWCPS2_301B210_060308 = MWCCPS2Compiler(
    id="mwcps2-3.0.1b210-060308",
    cc=MWCPS2_CC,
)

# PSP
PSP_GCC_1_3_1 = GCCCompiler(
    id="psp-gcc-1.3.1",
    platform=PSP,
    cc='${COMPILER_DIR}/bin/psp-gcc -B. -c ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
)

PSPSNC_1_2_7503_0 = GCCCompiler(
    id="pspsnc_1.2.7503.0",
    platform=PSP,
    cc='${WINE} ${COMPILER_DIR}/pspsnc.exe -c -td=. ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
)

MWCCPSP_CC = (
    '${WIBO} ${COMPILER_DIR}/mwccpsp.exe -c ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"'
)

MWCCPSP_3_0_1_121 = MWCCPSPCompiler(
    id="mwccpsp_3.0.1_121",
    cc=MWCCPSP_CC,
)
MWCCPSP_3_0_1_134 = MWCCPSPCompiler(
    id="mwccpsp_3.0.1_134",
    cc=MWCCPSP_CC,
)
MWCCPSP_3_0_1_139 = MWCCPSPCompiler(
    id="mwccpsp_3.0.1_139",
    cc=MWCCPSP_CC,
)
MWCCPSP_3_0_1_147 = MWCCPSPCompiler(
    id="mwccpsp_3.0.1_147",
    cc=MWCCPSP_CC,
)
MWCCPSP_3_0_1_151 = MWCCPSPCompiler(
    id="mwccpsp_3.0.1_151",
    cc=MWCCPSP_CC,
)
MWCCPSP_3_0_1_180 = MWCCPSPCompiler(
    id="mwccpsp_3.0.1_180",
    cc=MWCCPSP_CC,
)
MWCCPSP_3_0_1_192 = MWCCPSPCompiler(
    id="mwccpsp_3.0.1_192",
    cc=MWCCPSP_CC,
)
MWCCPSP_3_0_1_201 = MWCCPSPCompiler(
    id="mwccpsp_3.0.1_201",
    cc=MWCCPSP_CC,
)
MWCCPSP_3_0_1_205 = MWCCPSPCompiler(
    id="mwccpsp_3.0.1_205",
    cc=MWCCPSP_CC,
)
MWCCPSP_3_0_1_210 = MWCCPSPCompiler(
    id="mwccpsp_3.0.1_210",
    cc=MWCCPSP_CC,
)
MWCCPSP_3_0_1_219 = MWCCPSPCompiler(
    id="mwccpsp_3.0.1_219",
    cc=MWCCPSP_CC,
)

# N64
IDO53 = IDOCompiler(
    id="ido5.3",
    platform=N64,
    cc='USR_LIB="${COMPILER_DIR}" "${COMPILER_DIR}/cc" -c -Xcpluscomm -G0 -non_shared -Wab,-r4300_mul -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
)

IDO53_CXX = IDOCompiler(
    id="ido5.3_c++",
    platform=N64,
    cc='"${COMPILER_DIR}"/usr/bin/qemu-irix -silent -L "${COMPILER_DIR}" "${COMPILER_DIR}/usr/lib/CC" -I "{COMPILER_DIR}"/usr/include -c -Xcpluscomm -G0 -non_shared -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
    language=Language.OLD_CXX,
)

IDO71 = IDOCompiler(
    id="ido7.1",
    platform=N64,
    cc='USR_LIB="${COMPILER_DIR}" "${COMPILER_DIR}/cc" -c -Xcpluscomm -G0 -non_shared -Wab,-r4300_mul -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
)

IDO60 = IDOCompiler(
    id="ido6.0",
    platform=N64,
    cc='"${COMPILER_DIR}"/usr/bin/qemu-irix -silent -L "${COMPILER_DIR}" "${COMPILER_DIR}/usr/lib/driver" -c -Xcpluscomm -G0 -non_shared -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
)

MIPS_PRO_744 = IDOCompiler(
    id="mips_pro_744",
    platform=N64,
    cc='"${COMPILER_DIR}"/usr/bin/qemu-irix -silent -L "${COMPILER_DIR}" "${COMPILER_DIR}/usr/lib/driver" -c -Xcpluscomm -G0 -non_shared -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
)

GCC272KMC = GCCCompiler(
    id="gcc2.7.2kmc",
    platform=N64,
    cc='COMPILER_PATH="${COMPILER_DIR}" "${COMPILER_DIR}"/gcc -c -G0 -mgp32 -mfp32 ${COMPILER_FLAGS} "${INPUT}" -o "${OUTPUT}"',
)

GCC281PM = GCCCompiler(
    id="gcc2.8.1pm",
    platform=N64,
    cc='"${COMPILER_DIR}"/gcc -G0 -c -B "${COMPILER_DIR}"/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

CCN64_CPP_C = '/usr/bin/cpp -E -lang-c -undef -D__GNUC__=2 -Dmips -D__mips__ -D__mips -Dn64 -D__n64__ -D__n64 -D_PSYQ -D__EXTENSIONS__ -D_MIPSEB -D__CHAR_UNSIGNED__ "$INPUT" '
CCN64_CPP_CXX = '/usr/bin/cpp -E -lang-c++ -undef -D__GNUC__=2 -D__cplusplus -Dmips -D__mips__ -D__mips -Dn64 -D__n64__ -D__n64 -D_PSYQ -D__EXTENSIONS__ -D_MIPSEB -D__CHAR_UNSIGNED__ -D_LANGUAGE_C_PLUS_PLUS "$INPUT" '

GCC272SN0001 = GCCCompiler(
    id="gcc2.7.2sn0001",
    platform=N64,
    cc=CCN64_CPP_C
    + '| ${WIBO} "${COMPILER_DIR}"/cc1n64.exe ${COMPILER_FLAGS} -o "$OUTPUT".s '
    '&& ${WIBO} "${COMPILER_DIR}"/asn64.exe -q "$OUTPUT".s -o "$OUTPUT".obj '
    '&& "${COMPILER_DIR}"/psyq-obj-parser "$OUTPUT".obj -o "$OUTPUT" -b -n -s',
)

GCC272SN0001CXX = GCCCompiler(
    id="gcc2.7.2sn0001-cxx",
    base_compiler=GCC272SN0001,
    platform=N64,
    cc=CCN64_CPP_CXX
    + '| ${WIBO} "${COMPILER_DIR}"/cc1pln64.exe ${COMPILER_FLAGS} -o "$OUTPUT".s '
    '&& ${WIBO} "${COMPILER_DIR}"/asn64.exe -q "$OUTPUT".s -o "$OUTPUT".obj '
    '&& "${COMPILER_DIR}"/psyq-obj-parser "$OUTPUT".obj -o "$OUTPUT" -b -n -s',
)

GCC272SN0004 = GCCCompiler(
    id="gcc2.7.2sn0004",
    platform=N64,
    cc='/usr/bin/cpp -P "$INPUT" | ${WIBO} "${COMPILER_DIR}"/cc1n64.exe -quiet -G0 -mcpu=vr4300 -mips3 -mhard-float -meb ${COMPILER_FLAGS} -o "$OUTPUT".s && ${WIBO} "${COMPILER_DIR}"/asn64.exe -q -G0 "$OUTPUT".s -o "$OUTPUT".obj && "${COMPILER_DIR}"/psyq-obj-parser "$OUTPUT".obj -o "$OUTPUT" -b -n',
)

GCC272SN0006 = GCCCompiler(
    id="gcc2.7.2sn0006",
    platform=N64,
    cc=CCN64_CPP_C
    + '| ${WIBO} "${COMPILER_DIR}"/cc1n64.exe ${COMPILER_FLAGS} -o "$OUTPUT".s '
    '&& ${WIBO} "${COMPILER_DIR}"/asn64.exe -q -G0 "$OUTPUT".s -o "$OUTPUT".obj '
    '&& "${COMPILER_DIR}"/psyq-obj-parser "$OUTPUT".obj -o "$OUTPUT" -b -n -s',
)

GCC272SN0006CXX = GCCCompiler(
    id="gcc2.7.2sn0006-cxx",
    base_compiler=GCC272SN0006,
    platform=N64,
    cc=CCN64_CPP_CXX
    + '| ${WIBO} "${COMPILER_DIR}"/cc1pln64.exe ${COMPILER_FLAGS} -o "$OUTPUT".s '
    '&& ${WIBO} "${COMPILER_DIR}"/asn64.exe -q -G0 "$OUTPUT".s -o "$OUTPUT".obj '
    '&& "${COMPILER_DIR}"/psyq-obj-parser "$OUTPUT".obj -o "$OUTPUT" -b -n -s',
)

GCC272SNEW = GCCCompiler(
    id="gcc2.7.2snew",
    platform=N64,
    cc='"${COMPILER_DIR}"/cpp -lang-c -undef "$INPUT" | "${COMPILER_DIR}"/cc1 -mfp32 -mgp32 -G0 -quiet -mcpu=vr4300 -fno-exceptions ${COMPILER_FLAGS} -o "$OUTPUT".s && python3 "${COMPILER_DIR}"/modern-asn64.py mips-linux-gnu-as "$OUTPUT".s -G0 -EB -mips3 -O1 -mabi=32 -mgp32 -march=vr4300 -mfp32 -mno-shared -o "$OUTPUT"',
)

GCC281SN = GCCCompiler(
    id="gcc2.8.1sn",
    platform=N64,
    cc=CCN64_CPP_C
    + '| ${WIBO} "${COMPILER_DIR}"/cc1n64.exe ${COMPILER_FLAGS} -o "$OUTPUT".s '
    '&& ${WIBO} "${COMPILER_DIR}"/asn64.exe -q -G0 "$OUTPUT".s -o "$OUTPUT".obj '
    '&& "${COMPILER_DIR}"/psyq-obj-parser "$OUTPUT".obj -o "$OUTPUT" -b -n',
)

GCC281SNCXX = GCCCompiler(
    id="gcc2.8.1sn-cxx",
    base_compiler=GCC281SN,
    platform=N64,
    cc=CCN64_CPP_CXX
    + '| ${WIBO} "${COMPILER_DIR}"/cc1pln64.exe ${COMPILER_FLAGS} -o "$OUTPUT".s '
    '&& ${WIBO} "${COMPILER_DIR}"/asn64.exe -q -G0 "$OUTPUT".s -o "$OUTPUT".obj '
    '&& "${COMPILER_DIR}"/psyq-obj-parser "$OUTPUT".obj -o "$OUTPUT" -b -n',
)

GCC281SNEWCXX = GCCCompiler(
    id="gcc2.8.1snew-cxx",
    base_compiler=GCC281SN,
    platform=N64,
    cc=CCN64_CPP_CXX
    + '| ${WIBO} "${COMPILER_DIR}"/cc1pln64.exe ${COMPILER_FLAGS} -o "$OUTPUT".s '
    '&& python3 "${COMPILER_DIR}"/modern-asn64.py mips-linux-gnu-as "$OUTPUT".s -G0 -EB -mtune=vr4300 -march=vr4300 -mabi=32 -O1 --no-construct-floats -o "$OUTPUT"',
)

EGCS1124 = GCCCompiler(
    id="egcs_1.1.2-4",
    platform=N64,
    cc='printf "%s" "${COMPILER_FLAGS}" | COMPILER_PATH="${COMPILER_DIR}" xargs -- "${COMPILER_DIR}"/mips-linux-gcc -c -G 0 -fno-PIC -mgp32 -mfp32 -mcpu=4300 -nostdinc "${INPUT}" -o "${OUTPUT}"',
)

EGCS1124C = GCCCompiler(
    id="egcs_1.1.2-4c",
    platform=N64,
    cc='printf "%s" "${COMPILER_FLAGS}" | COMPILER_PATH="${COMPILER_DIR}" xargs -- "${COMPILER_DIR}"/gcc -c -G 0 -fno-PIC -mgp32 -mfp32 -mcpu=4300 -nostdinc "${INPUT}" -o "${OUTPUT}"',
)

GCC440MIPS64ELF = GCCCompiler(
    id="gcc4.4.0-mips64-elf",
    platform=N64,
    cc='"${COMPILER_DIR}"/bin/mips64-elf-gcc -I "${COMPILER_DIR}"/mips64-elf/include -c ${COMPILER_FLAGS} "${INPUT}" -o "${OUTPUT}"',
)

# IRIX
IDO53_IRIX = IDOCompiler(
    id="ido5.3_irix",
    platform=IRIX,
    cc='USR_LIB="${COMPILER_DIR}" "${COMPILER_DIR}/cc" -c -Xcpluscomm -G0 -non_shared -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
    base_compiler=IDO53,
)

IDO53_ASM_IRIX = IDOCompiler(
    id="ido5.3_asm_irix",
    platform=IRIX,
    cc='USR_LIB="${COMPILER_DIR}" "${COMPILER_DIR}/cc" -c -Xcpluscomm -G0 -non_shared -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
    base_compiler=IDO53,
    language=Language.ASSEMBLY,
)

IDO53_CXX_IRIX = IDOCompiler(
    id="ido5.3_c++_irix",
    platform=IRIX,
    cc='"${COMPILER_DIR}"/usr/bin/qemu-irix -silent -L "${COMPILER_DIR}" "${COMPILER_DIR}/usr/lib/CC" -I "${COMPILER_DIR}"/usr/include -c -Xcpluscomm -G0 -non_shared -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
    base_compiler=IDO53_CXX,
    language=Language.OLD_CXX,
)

IDO53PASCAL = IDOCompiler(
    id="ido5.3Pascal",
    platform=IRIX,
    cc='USR_LIB="${COMPILER_DIR}" "${COMPILER_DIR}/cc" -c -Xcpluscomm -G0 -non_shared ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
    base_compiler=IDO53,
    language=Language.PASCAL,
)

IDO60_IRIX = IDOCompiler(
    id="ido6.0_irix",
    platform=IRIX,
    cc='"${COMPILER_DIR}"/usr/bin/qemu-irix -silent -L "${COMPILER_DIR}" "${COMPILER_DIR}/usr/lib/driver" -c -Xcpluscomm -G0 -non_shared -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
    base_compiler=IDO60,
)

IDO71_IRIX = IDOCompiler(
    id="ido7.1_irix",
    platform=IRIX,
    cc='USR_LIB="${COMPILER_DIR}" "${COMPILER_DIR}/cc" -c -Xcpluscomm -G0 -non_shared -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
    base_compiler=IDO71,
)

IDO71PASCAL = IDOCompiler(
    id="ido7.1Pascal",
    platform=IRIX,
    cc='USR_LIB="${COMPILER_DIR}" "${COMPILER_DIR}/cc" -c ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
    base_compiler=IDO71,
    language=Language.PASCAL,
)

MIPS_PRO_744_IRIX = IDOCompiler(
    id="mips_pro_744_irix",
    platform=IRIX,
    cc='"${COMPILER_DIR}"/usr/bin/qemu-irix -silent -L "${COMPILER_DIR}" "${COMPILER_DIR}/usr/lib/driver" -c -Xcpluscomm -G0 -non_shared -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
    base_compiler=MIPS_PRO_744,
)

# MACOSX
GCC_CC1 = '"${COMPILER_DIR}"/powerpc-darwin-cross/bin/cc1 -quiet ${COMPILER_FLAGS} "${INPUT}" -o "${OUTPUT}.s" && python3 ${COMPILER_DIR}/convert_gas_syntax.py "${OUTPUT}.s" "${FUNCTION}" new > "${OUTPUT}_new.s" && powerpc-linux-gnu-as "${OUTPUT}_new.s" -o "${OUTPUT}"'
GCC_CC1_ALT = '"${COMPILER_DIR}"/cc1 -quiet ${COMPILER_FLAGS} "${INPUT}" -o "${OUTPUT}.s" && python3 ${COMPILER_DIR}/convert_gas_syntax.py "${OUTPUT}.s" "${FUNCTION}" new > "${OUTPUT}_new.s" && powerpc-linux-gnu-as "${OUTPUT}_new.s" -o "${OUTPUT}"'
GCC_CC1PLUS = '"${COMPILER_DIR}"/powerpc-darwin-cross/bin/cc1plus -quiet ${COMPILER_FLAGS} "${INPUT}" -o "${OUTPUT}.s" && python3 ${COMPILER_DIR}/convert_gas_syntax.py "${OUTPUT}.s" "${FUNCTION}" new > "${OUTPUT}_new.s" && powerpc-linux-gnu-as "${OUTPUT}_new.s" -o "${OUTPUT}"'
GCC_CC1PLUS_ALT = '"${COMPILER_DIR}"/cc1plus -quiet ${COMPILER_FLAGS} "${INPUT}" -o "${OUTPUT}.s" && python3 ${COMPILER_DIR}/convert_gas_syntax.py "${OUTPUT}.s" "${FUNCTION}" new > "${OUTPUT}_new.s" && powerpc-linux-gnu-as "${OUTPUT}_new.s" -o "${OUTPUT}"'

XCODE_GCC401_C = GCCCompiler(
    id="gcc-5370",
    platform=MACOSX,
    cc=GCC_CC1,
)

XCODE_GCC401_CPP = GCCCompiler(
    id="gcc-5370-cpp",
    platform=MACOSX,
    cc=GCC_CC1PLUS,
    base_compiler=XCODE_GCC401_C,
)

XCODE_24_C = GCCCompiler(
    id="gcc-5363",
    platform=MACOSX,
    cc=GCC_CC1_ALT,
)

XCODE_24_CPP = GCCCompiler(
    id="gcc-5363-cpp",
    platform=MACOSX,
    cc=GCC_CC1PLUS_ALT,
    base_compiler=XCODE_24_C,
)

XCODE_GCC400_C = GCCCompiler(
    id="gcc-5026",
    platform=MACOSX,
    cc=GCC_CC1_ALT,
)

XCODE_GCC400_CPP = GCCCompiler(
    id="gcc-5026-cpp",
    platform=MACOSX,
    cc=GCC_CC1PLUS_ALT,
    base_compiler=XCODE_GCC400_C,
)

PBX_GCC3 = GCCCompiler(
    id="gcc3-1041",
    platform=MACOSX,
    cc=GCC_CC1_ALT,
)

# GC_WII
# Thanks to Gordon Davisson for the xargs trick:
# https://superuser.com/questions/1529226/get-bash-to-respect-quotes-when-word-splitting-subshell-output/1529316#1529316
MWCCEPPC_CC = 'printf "%s" "${COMPILER_FLAGS}" | xargs -x -- ${WIBO} "${COMPILER_DIR}/mwcceppc.exe" -pragma "msg_show_realref off" -c -proc gekko -nostdinc -stderr -o "${OUTPUT}" "${INPUT}"'

MWCC_233_144 = MWCCWiiGCCompiler(
    id="mwcc_233_144",
    cc=MWCCEPPC_CC,
)

MWCC_233_159 = MWCCWiiGCCompiler(
    id="mwcc_233_159",
    cc=MWCCEPPC_CC,
)

MWCC_233_159P1 = MWCCWiiGCCompiler(
    id="mwcc_233_159p1",
    cc=MWCCEPPC_CC,
)

MWCC_233_163 = MWCCWiiGCCompiler(
    id="mwcc_233_163",
    cc=MWCCEPPC_CC,
)

MWCC_233_163E = MWCCWiiGCCompiler(
    id="mwcc_233_163e",
    cc='${WIBO} "${COMPILER_DIR}/mwcceppc.125.exe" -c -proc gekko -nostdinc -stderr ${COMPILER_FLAGS} -o "${OUTPUT}.1" "${INPUT}" && ${WIBO} "${COMPILER_DIR}/mwcceppc.exe" -c -proc gekko -nostdinc -stderr ${COMPILER_FLAGS} -o "${OUTPUT}.2" "${INPUT}" && python3 "${COMPILER_DIR}/frank.py" "${OUTPUT}.1" "${OUTPUT}.2" "${OUTPUT}"',
)

MWCC_233_163N = MWCCWiiGCCompiler(
    id="mwcc_233_163n",
    cc=MWCCEPPC_CC,
)

MWCC_242_53 = MWCCWiiGCCompiler(
    id="mwcc_242_53",
    cc=MWCCEPPC_CC,
)

MWCC_242_81 = MWCCWiiGCCompiler(
    id="mwcc_242_81",
    cc=MWCCEPPC_CC,
)

MWCC_242_81R = MWCCWiiGCCompiler(
    id="mwcc_242_81r",
    cc=MWCCEPPC_CC,
)

MWCC_247_92 = MWCCWiiGCCompiler(
    id="mwcc_247_92",
    cc=MWCCEPPC_CC,
)

MWCC_247_92P1 = MWCCWiiGCCompiler(
    id="mwcc_247_92p1",
    cc=MWCCEPPC_CC,
)

MWCC_247_105 = MWCCWiiGCCompiler(
    id="mwcc_247_105",
    cc=MWCCEPPC_CC,
)

MWCC_247_107 = MWCCWiiGCCompiler(
    id="mwcc_247_107",
    cc=MWCCEPPC_CC,
)

MWCC_247_108 = MWCCWiiGCCompiler(
    id="mwcc_247_108",
    cc=MWCCEPPC_CC,
)

MWCC_41_51213 = MWCCWiiGCCompiler(
    id="mwcc_41_51213",
    cc=MWCCEPPC_CC,
)

MWCC_41_60209 = MWCCWiiGCCompiler(
    id="mwcc_41_60209",
    cc=MWCCEPPC_CC,
)

MWCC_41_60831 = MWCCWiiGCCompiler(
    id="mwcc_41_60831",
    cc=MWCCEPPC_CC,
)

MWCC_41_60126 = MWCCWiiGCCompiler(
    id="mwcc_41_60126",
    cc=MWCCEPPC_CC,
)

MWCC_42_127 = MWCCWiiGCCompiler(
    id="mwcc_42_127",
    cc=MWCCEPPC_CC,
)

MWCC_42_140 = MWCCWiiGCCompiler(
    id="mwcc_42_140",
    cc=MWCCEPPC_CC,
)

MWCC_42_142 = MWCCWiiGCCompiler(
    id="mwcc_42_142",
    cc=MWCCEPPC_CC,
)

MWCC_42_60308 = MWCCWiiGCCompiler(
    id="mwcc_42_60308",
    cc=MWCCEPPC_CC,
)

MWCC_42_60422 = MWCCWiiGCCompiler(
    id="mwcc_42_60422",
    cc=MWCCEPPC_CC,
)

MWCC_43_145 = MWCCWiiGCCompiler(
    id="mwcc_43_145",
    cc=MWCCEPPC_CC,
)

MWCC_43_151 = MWCCWiiGCCompiler(
    id="mwcc_43_151",
    cc=MWCCEPPC_CC,
)

MWCC_43_188 = MWCCWiiGCCompiler(
    id="mwcc_43_188",
    cc=MWCCEPPC_CC,
)

MWCC_43_172 = MWCCWiiGCCompiler(
    id="mwcc_43_172",
    cc=MWCCEPPC_CC,
)

MWCC_43_202 = MWCCWiiGCCompiler(
    id="mwcc_43_202",
    cc=MWCCEPPC_CC,
)

MWCC_43_213 = MWCCWiiGCCompiler(
    id="mwcc_43_213",
    cc=MWCCEPPC_CC,
)

PRODG_NGC_CC = "SN_NGC_PATH=${COMPILER_DIR} ${WINE} ${COMPILER_DIR}/ngccc.exe ${COMPILER_FLAGS} -o ${OUTPUT} ${INPUT}"

PRODG_35 = GCCGCCompiler(
    id="prodg_35",
    platform=GC_WII,
    cc=PRODG_NGC_CC,
)

PRODG_35_B140 = GCCGCCompiler(
    id="prodg_35_b140",
    platform=GC_WII,
    cc=PRODG_NGC_CC,
)

PRODG_37 = GCCGCCompiler(
    id="prodg_37",
    platform=GC_WII,
    cc=PRODG_NGC_CC,
)

PRODG_381 = GCCGCCompiler(
    id="prodg_381",
    platform=GC_WII,
    cc=PRODG_NGC_CC,
)

PRODG_393 = GCCGCCompiler(
    id="prodg_393",
    platform=GC_WII,
    cc=PRODG_NGC_CC,
)

# NDS_ARM9
MWCCARM_CC = '${WIBO} "${COMPILER_DIR}/mwccarm.exe" -pragma "msg_show_realref off" -c -proc arm946e -nostdinc -stderr ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"'

MWCC_20_72 = MWCCNDSArm9Compiler(
    id="mwcc_20_72",
    cc=MWCCARM_CC,
)

MWCC_20_79 = MWCCNDSArm9Compiler(
    id="mwcc_20_79",
    cc=MWCCARM_CC,
)

MWCC_20_82 = MWCCNDSArm9Compiler(
    id="mwcc_20_82",
    cc=MWCCARM_CC,
)

MWCC_20_84 = MWCCNDSArm9Compiler(
    id="mwcc_20_84",
    cc=MWCCARM_CC,
)

MWCC_20_87 = MWCCNDSArm9Compiler(
    id="mwcc_20_87",
    cc=MWCCARM_CC,
)

MWCC_30_114 = MWCCNDSArm9Compiler(
    id="mwcc_30_114",
    cc=MWCCARM_CC,
)

MWCC_30_123 = MWCCNDSArm9Compiler(
    id="mwcc_30_123",
    cc=MWCCARM_CC,
)

MWCC_30_126 = MWCCNDSArm9Compiler(
    id="mwcc_30_126",
    cc=MWCCARM_CC,
)

MWCC_30_131 = MWCCNDSArm9Compiler(
    id="mwcc_30_131",
    cc=MWCCARM_CC,
)

MWCC_30_133 = MWCCNDSArm9Compiler(
    id="mwcc_30_133",
    cc=MWCCARM_CC,
)

MWCC_30_134 = MWCCNDSArm9Compiler(
    id="mwcc_30_134",
    cc=MWCCARM_CC,
)

MWCC_30_136 = MWCCNDSArm9Compiler(
    id="mwcc_30_136",
    cc=MWCCARM_CC,
)

MWCC_30_137 = MWCCNDSArm9Compiler(
    id="mwcc_30_137",
    cc=MWCCARM_CC,
)

MWCC_30_138 = MWCCNDSArm9Compiler(
    id="mwcc_30_138",
    cc=MWCCARM_CC,
)

MWCC_30_139 = MWCCNDSArm9Compiler(
    id="mwcc_30_139",
    cc=MWCCARM_CC,
)

MWCC_40_1018 = MWCCNDSArm9Compiler(
    id="mwcc_40_1018",
    cc=MWCCARM_CC,
)

MWCC_40_1024 = MWCCNDSArm9Compiler(
    id="mwcc_40_1024",
    cc=MWCCARM_CC,
)

MWCC_40_1026 = MWCCNDSArm9Compiler(
    id="mwcc_40_1026",
    cc=MWCCARM_CC,
)

MWCC_40_1027 = MWCCNDSArm9Compiler(
    id="mwcc_40_1027",
    cc=MWCCARM_CC,
)

MWCC_40_1028 = MWCCNDSArm9Compiler(
    id="mwcc_40_1028",
    cc=MWCCARM_CC,
)

MWCC_40_1034 = MWCCNDSArm9Compiler(
    id="mwcc_40_1034",
    cc=MWCCARM_CC,
)

MWCC_40_1036 = MWCCNDSArm9Compiler(
    id="mwcc_40_1036",
    cc=MWCCARM_CC,
)

MWCC_40_1051 = MWCCNDSArm9Compiler(
    id="mwcc_40_1051",
    cc=MWCCARM_CC,
)

CL_WIN = '${WINE} "${COMPILER_DIR}/Bin/CL.EXE" /c /nologo /I"Z:${COMPILER_DIR}/Include/" ${COMPILER_FLAGS} /Fd"Z:/tmp/" /Bk"Z:/tmp/" /Fo"Z:${OUTPUT}" "Z:${INPUT}"'

MSVC40 = MSVCCompiler(
    id="msvc4.0",
    platform=WIN32,
    cc=CL_WIN,
)

MSVC41 = MSVCCompiler(
    id="msvc4.1",
    platform=WIN32,
    cc=CL_WIN,
)

MSVC42 = MSVCCompiler(
    id="msvc4.2",
    platform=WIN32,
    cc=CL_WIN,
)

MSVC60 = MSVCCompiler(
    id="msvc6.0",
    platform=WIN32,
    cc=CL_WIN,
)

MSVC63 = MSVCCompiler(
    id="msvc6.3",
    platform=WIN32,
    cc=CL_WIN,
)

MSVC64 = MSVCCompiler(
    id="msvc6.4",
    platform=WIN32,
    cc=CL_WIN,
)

MSVC65 = MSVCCompiler(
    id="msvc6.5",
    platform=WIN32,
    cc=CL_WIN,
)

MSVC65PP = MSVCCompiler(
    id="msvc6.5pp",
    platform=WIN32,
    cc=CL_WIN,
)

MSVC66 = MSVCCompiler(
    id="msvc6.6",
    platform=WIN32,
    cc=CL_WIN,
)

MSVC70 = MSVCCompiler(
    id="msvc7.0",
    platform=WIN32,
    cc=CL_WIN,
)

MSVC71 = MSVCCompiler(
    id="msvc7.1",
    platform=WIN32,
    cc=CL_WIN,
)

MSVC80 = MSVCCompiler(
    id="msvc8.0",
    platform=WIN32,
    cc=CL_WIN,
)

MSVC80P = MSVCCompiler(
    id="msvc8.0p",
    platform=WIN32,
    cc=CL_WIN,
)
# Watcom doesn't like '/' in paths passed to it so we need to replace them.
WATCOM_ARGS = ' -zq -i="Z:${COMPILER_DIR}/h" -i="Z:${COMPILER_DIR}/h/nt" ${COMPILER_FLAGS} -fo"Z:${OUTPUT}" "Z:${INPUT}"'
WATCOM_CC = (
    '${WINE} "${COMPILER_DIR}/binnt/wcc386.exe" $(echo "'
    + WATCOM_ARGS
    + "\" | sed 's:/:\\\\:g')"
)
WATCOM_CXX = (
    '${WINE} "${COMPILER_DIR}/binnt/wpp386.exe" $(echo "'
    + WATCOM_ARGS
    + "\" | sed 's:/:\\\\:g')"
)

WATCOM_105_C = WatcomCompiler(
    id="wcc10.5",
    platform=MSDOS,
    cc=WATCOM_CC,
)

WATCOM_105_CPP = WatcomCompiler(
    id="wpp10.5",
    base_compiler=WATCOM_105_C,
    platform=MSDOS,
    cc=WATCOM_CXX,
)

WATCOM_105A_C = WatcomCompiler(
    id="wcc10.5a",
    platform=MSDOS,
    cc=WATCOM_CC,
)

WATCOM_105A_CPP = WatcomCompiler(
    id="wpp10.5a",
    base_compiler=WATCOM_105A_C,
    platform=MSDOS,
    cc=WATCOM_CXX,
)

WATCOM_106_C = WatcomCompiler(
    id="wcc10.6",
    platform=MSDOS,
    cc=WATCOM_CC,
)

WATCOM_106_CPP = WatcomCompiler(
    id="wpp10.6",
    base_compiler=WATCOM_106_C,
    platform=MSDOS,
    cc=WATCOM_CXX,
)

WATCOM_110_C = WatcomCompiler(
    id="wcc11.0",
    platform=MSDOS,
    cc=WATCOM_CC,
)

WATCOM_110_CPP = WatcomCompiler(
    id="wpp11.0",
    base_compiler=WATCOM_110_C,
    platform=MSDOS,
    cc=WATCOM_CXX,
)

BORLAND_MSDOS_CC = (
    "echo \"\\$_hdimage = '+0 ${COMPILER_DIR} +1'\" > .dosemurc && "
    'cat "${INPUT}" | unix2dos > dos_src.c && '
    '(HOME="$(pwd)" /usr/bin/dosemu -quiet -dumb -f .dosemurc -K . -E "D:\\bin\\bcc.exe -ID:\\include ${COMPILER_FLAGS} -c -oout.o dos_src.c") && '
    'cp out.o "${OUTPUT}"'
)

BORLAND_20_C = BorlandCompiler(
    id="bcc2.0",
    platform=MSDOS,
    cc=BORLAND_MSDOS_CC,
)

BORLAND_31_C = BorlandCompiler(
    id="bcc3.1",
    platform=MSDOS,
    cc=BORLAND_MSDOS_CC,
)

_all_compilers: List[Compiler] = [
    DUMMY,
    DUMMY_LONGRUNNING,
    # GBA
    AGBCC,
    OLD_AGBCC,
    AGBCCPP,
    # N3DS
    ARMCC_40_771,
    ARMCC_40_821,
    ARMCC_41_561,
    ARMCC_41_713,
    ARMCC_41_791,
    ARMCC_41_894,
    ARMCC_41_921,
    ARMCC_41_1049,
    ARMCC_41_1440,
    ARMCC_41_1454,
    ARMCC_504_82,
    # Switch
    CLANG_391,
    CLANG_401,
    CLANG_800,
    # PS1
    PSYQ_263_221,
    PSYQ33,
    PSYQ35,
    PSYQ36,
    PSYQ40,
    PSYQ41,
    PSYQ43,
    PSYQ44,
    PSYQ45,
    PSYQ46,
    GCC257_PSX,
    GCC260_PSX,
    GCC263_PSX,
    GCC272_PSX,
    GCC280_PSX,
    GCC281_PSX,
    GCC29166_PSX,
    GCC2952_PSX,
    GCC270_MIPSEL,
    GCC271_MIPSEL,
    GCC2721_MIPSEL,
    GCC2722_MIPSEL,
    GCC2723_MIPSEL,
    # PSP
    PSP_GCC_1_3_1,
    PSPSNC_1_2_7503_0,
    MWCCPSP_3_0_1_121,
    MWCCPSP_3_0_1_134,
    MWCCPSP_3_0_1_139,
    MWCCPSP_3_0_1_147,
    MWCCPSP_3_0_1_151,
    MWCCPSP_3_0_1_180,
    MWCCPSP_3_0_1_192,
    MWCCPSP_3_0_1_201,
    MWCCPSP_3_0_1_205,
    MWCCPSP_3_0_1_210,
    MWCCPSP_3_0_1_219,
    # Saturn
    CYGNUS_2_7_96Q3,
    # Dreamcast
    SHC_V51R11,
    # PS2
    IOP_GCC281,
    IOP_GCC2952_102,
    EE_GCC29_990721,
    EE_GCC29_991111,
    EE_GCC29_991111A,
    EE_GCC29_991111_01,
    EE_GCC29_991111_01_DTLS13010,
    EE_GCC2952_273A,
    EE_GCC2952_274,
    EE_GCC2953_107,
    EE_GCC2953_114,
    EE_GCC2953_136,
    EE_GCC296,
    EE_GCC32_030210_BETA2,
    EE_GCC32_030926,
    EE_GCC32_040921,
    MWCPS2_23_991202,
    MWCPS2_233_000906,
    MWCPS2_24_001213,
    MWCPS2_30_011126,
    MWCPS2_301_020123,
    MWCPS2_303_020716,
    MWCPS2_30B22_020926,
    MWCPS2_30B38_030307,
    MWCPS2_30B50_030527,
    MWCPS2_30B52_030722,
    MWCPS2_301B44_030325,
    MWCPS2_301B51_030512,
    MWCPS2_301B74_030811,
    MWCPS2_301B75_030916,
    MWCPS2_301B87_031208,
    MWCPS2_301B95_040309,
    MWCPS2_301B103_040528,
    MWCPS2_301B119_040914,
    MWCPS2_301B145_050209,
    MWCPS2_301B151_050317,
    MWCPS2_301B198_051011,
    MWCPS2_301B205_051227,
    MWCPS2_301B210_060308,
    # N64
    IDO53,
    IDO53_CXX,
    IDO60,
    IDO71,
    MIPS_PRO_744,
    GCC272KMC,
    GCC272SN0001,
    GCC272SN0001CXX,
    GCC272SN0004,
    GCC272SN0006,
    GCC272SN0006CXX,
    GCC272SNEW,
    GCC281PM,
    GCC281SN,
    GCC281SNCXX,
    GCC281SNEWCXX,
    EGCS1124,
    EGCS1124C,
    GCC440MIPS64ELF,
    # IRIX
    IDO53_IRIX,
    IDO53_ASM_IRIX,
    IDO53_CXX_IRIX,
    IDO53PASCAL,
    IDO60_IRIX,
    IDO71_IRIX,
    IDO71PASCAL,
    MIPS_PRO_744_IRIX,
    # GC_WII
    MWCC_233_144,
    MWCC_233_159,
    MWCC_233_159P1,
    MWCC_233_163,
    MWCC_233_163E,
    MWCC_233_163N,
    MWCC_242_53,
    MWCC_242_81,
    MWCC_242_81R,
    MWCC_247_92,
    MWCC_247_92P1,
    MWCC_247_105,
    MWCC_247_107,
    MWCC_247_108,
    MWCC_41_51213,
    MWCC_41_60126,
    MWCC_41_60209,
    MWCC_41_60831,
    MWCC_42_127,
    MWCC_42_140,
    MWCC_42_142,
    MWCC_42_60308,
    MWCC_42_60422,
    MWCC_43_145,
    MWCC_43_151,
    MWCC_43_172,
    MWCC_43_188,
    MWCC_43_202,
    MWCC_43_213,
    PRODG_35,
    PRODG_35_B140,
    PRODG_37,
    PRODG_381,
    PRODG_393,
    # NDS
    MWCC_20_72,
    MWCC_20_79,
    MWCC_20_82,
    MWCC_20_84,
    MWCC_20_87,
    MWCC_30_114,
    MWCC_30_123,
    MWCC_30_126,
    MWCC_30_131,
    MWCC_30_133,
    MWCC_30_134,
    MWCC_30_136,
    MWCC_30_137,
    MWCC_30_138,
    MWCC_30_139,
    MWCC_40_1018,
    MWCC_40_1024,
    MWCC_40_1026,
    MWCC_40_1027,
    MWCC_40_1028,
    MWCC_40_1034,
    MWCC_40_1036,
    MWCC_40_1051,
    # MACOSX
    XCODE_GCC401_C,
    XCODE_GCC401_CPP,
    XCODE_24_C,
    XCODE_24_CPP,
    XCODE_GCC400_C,
    XCODE_GCC400_CPP,
    PBX_GCC3,
    # WIN32
    MSVC40,
    MSVC41,
    MSVC42,
    MSVC60,
    MSVC63,
    MSVC64,
    MSVC65,
    MSVC65PP,
    MSVC66,
    MSVC70,
    MSVC71,
    MSVC80,
    MSVC80P,
    # Watcom, DOS and Win32
    WATCOM_105_C,
    WATCOM_105_CPP,
    WATCOM_105A_C,
    WATCOM_105A_CPP,
    WATCOM_106_C,
    WATCOM_106_CPP,
    WATCOM_110_C,
    WATCOM_110_CPP,
    # Borland, DOS
    BORLAND_20_C,
    BORLAND_31_C,
]

_compilers = OrderedDict({c.id: c for c in _all_compilers if c.available()})

logger.info(f"Enabled {len(_compilers)} compiler(s): {', '.join(_compilers.keys())}")
logger.info(
    f"Available platform(s): {', '.join([platform.id for platform in available_platforms()])}"
)
