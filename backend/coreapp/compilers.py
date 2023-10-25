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
    COMMON_GCC_FLAGS,
    COMMON_GCC_PS1_FLAGS,
    COMMON_GCC_SATURN_FLAGS,
    COMMON_IDO_FLAGS,
    COMMON_MSVC_FLAGS,
    COMMON_MWCC_FLAGS,
    COMMON_WATCOM_FLAGS,
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
    SATURN,
    SWITCH,
    WIN9X,
    Platform,
)
from django.conf import settings
from rest_framework import status
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)

CONFIG_PY = "config.py"
COMPILER_BASE_PATH: Path = settings.COMPILER_BASE_PATH


@dataclass(frozen=True)
class Compiler:
    id: str
    cc: str
    platform: Platform
    flags: ClassVar[Flags]
    library_include_flag: str
    base_compiler: Optional["Compiler"] = None
    is_gcc: ClassVar[bool] = False
    is_ido: ClassVar[bool] = False
    is_mwcc: ClassVar[bool] = False
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
class GCCCompiler(Compiler):
    is_gcc: ClassVar[bool] = True
    flags: ClassVar[Flags] = COMMON_GCC_FLAGS
    library_include_flag: str = "-isystem"


@dataclass(frozen=True)
class GCCPS1Compiler(GCCCompiler):
    flags: ClassVar[Flags] = COMMON_GCC_PS1_FLAGS


@dataclass(frozen=True)
class GCCSaturnCompiler(GCCCompiler):
    flags: ClassVar[Flags] = COMMON_GCC_SATURN_FLAGS


@dataclass(frozen=True)
class IDOCompiler(Compiler):
    is_ido: ClassVar[bool] = True
    flags: ClassVar[Flags] = COMMON_IDO_FLAGS
    library_include_flag: str = "-I"


@dataclass(frozen=True)
class MWCCCompiler(Compiler):
    is_mwcc: ClassVar[bool] = True
    flags: ClassVar[Flags] = COMMON_MWCC_FLAGS
    library_include_flag: str = "-IZ:"


@dataclass(frozen=True)
class MSVCCompiler(Compiler):
    flags: ClassVar[Flags] = COMMON_MSVC_FLAGS
    library_include_flag: str = "/IZ:"


@dataclass(frozen=True)
class WatcomCompiler(Compiler):
    flags: ClassVar[Flags] = COMMON_WATCOM_FLAGS
    library_include_flag: str = "/IZ:"


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
    cc='cc -E -I "${COMPILER_DIR}"/include -iquote include -nostdinc -undef "$INPUT" | "${COMPILER_DIR}"/bin/agbcc $COMPILER_FLAGS -o - | arm-none-eabi-as -mcpu=arm7tdmi -o "$OUTPUT"',
)

OLD_AGBCC = GCCCompiler(
    id="old_agbcc",
    platform=GBA,
    cc='cc -E -I "${COMPILER_DIR}"/include -iquote include -nostdinc -undef "$INPUT" | "${COMPILER_DIR}"/bin/old_agbcc $COMPILER_FLAGS -o - | arm-none-eabi-as -mcpu=arm7tdmi -o "$OUTPUT"',
    base_compiler=AGBCC,
)

AGBCCPP = GCCCompiler(
    id="agbccpp",
    platform=GBA,
    cc='cc -E -I "${COMPILER_DIR}"/include -iquote include -nostdinc -undef "$INPUT" | "${COMPILER_DIR}"/bin/agbcp -quiet $COMPILER_FLAGS -o - | arm-none-eabi-as -mcpu=arm7tdmi -o "$OUTPUT"',
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
PSYQ_MSDOS_CC = (
    'cpp -P "$INPUT" | unix2dos > object.oc && cp ${COMPILER_DIR}/* . && '
    '(HOME="." dosemu -quiet -dumb -f ${COMPILER_DIR}/dosemurc -K . -E "CC1PSX.EXE -quiet ${COMPILER_FLAGS} -o object.os object.oc") && '
    '(HOME="." dosemu -quiet -dumb -f ${COMPILER_DIR}/dosemurc -K . -E "ASPSX.EXE -quiet object.os -o object.oo") && '
    '${COMPILER_DIR}/psyq-obj-parser object.oo -o "$OUTPUT"'
)
PSYQ_CC = (
    'cpp -P "$INPUT" | unix2dos | '
    '${WIBO} ${COMPILER_DIR}/CC1PSX.EXE -quiet ${COMPILER_FLAGS} -o "$OUTPUT".s && '
    '${WIBO} ${COMPILER_DIR}/ASPSX.EXE -quiet "$OUTPUT".s -o "$OUTPUT".obj && '
    '${COMPILER_DIR}/psyq-obj-parser "$OUTPUT".obj -o "$OUTPUT"'
)

PSYQ33 = GCCPS1Compiler(
    id="psyq3.3",
    platform=PS1,
    cc=PSYQ_MSDOS_CC,
)

PSYQ35 = GCCPS1Compiler(
    id="psyq3.5",
    platform=PS1,
    cc=PSYQ_MSDOS_CC,
)

PSYQ36 = GCCPS1Compiler(
    id="psyq3.6",
    platform=PS1,
    cc=PSYQ_MSDOS_CC,
)

PSYQ40 = GCCPS1Compiler(
    id="psyq4.0",
    platform=PS1,
    cc=PSYQ_CC,
)

PSYQ41 = GCCPS1Compiler(
    id="psyq4.1",
    platform=PS1,
    cc=PSYQ_CC,
)

PSYQ43 = GCCPS1Compiler(
    id="psyq4.3",
    platform=PS1,
    cc=PSYQ_CC,
)

PSYQ44 = GCCPS1Compiler(
    id="psyq4.4",
    platform=PS1,
    cc=PSYQ_CC,
)

PSYQ45 = GCCPS1Compiler(
    id="psyq4.5",
    platform=PS1,
    cc=PSYQ_CC,
)

PSYQ46 = GCCPS1Compiler(
    id="psyq4.6",
    platform=PS1,
    cc=PSYQ_CC,
)

PS1_GCC = (
    'cpp -E -lang-c -nostdinc "${INPUT}" -o "${INPUT}".i && '
    '${COMPILER_DIR}/gcc -c -pipe -B${COMPILER_DIR}/ ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}.i"'
)

GCC263_PSX = GCCPS1Compiler(
    id="gcc2.6.3-psx",
    platform=PS1,
    cc=PS1_GCC,
)

GCC260_MIPSEL = GCCPS1Compiler(
    id="gcc2.6.0-mipsel",
    platform=PS1,
    cc=PS1_GCC,
)

GCC263_MIPSEL = GCCPS1Compiler(
    id="gcc2.6.3-mipsel",
    platform=PS1,
    cc=PS1_GCC,
)

GCC270_MIPSEL = GCCPS1Compiler(
    id="gcc2.7.0-mipsel",
    platform=PS1,
    cc=PS1_GCC,
)

GCC271_MIPSEL = GCCPS1Compiler(
    id="gcc2.7.1-mipsel",
    platform=PS1,
    cc=PS1_GCC,
)

GCC272_MIPSEL = GCCPS1Compiler(
    id="gcc2.7.2-mipsel",
    platform=PS1,
    cc=PS1_GCC,
)

GCC2721_MIPSEL = GCCPS1Compiler(
    id="gcc2.7.2.1-mipsel",
    platform=PS1,
    cc=PS1_GCC,
)

GCC2722_MIPSEL = GCCPS1Compiler(
    id="gcc2.7.2.2-mipsel",
    platform=PS1,
    cc=PS1_GCC,
)

GCC2723_MIPSEL = GCCPS1Compiler(
    id="gcc2.7.2.3-mipsel",
    platform=PS1,
    cc=PS1_GCC,
)

GCC280_MIPSEL = GCCPS1Compiler(
    id="gcc2.8.0-mipsel",
    platform=PS1,
    cc=PS1_GCC,
)

GCC281_MIPSEL = GCCPS1Compiler(
    id="gcc2.8.1-mipsel",
    platform=PS1,
    cc=PS1_GCC,
)

GCC29166_MIPSEL = GCCPS1Compiler(
    id="gcc2.91.66-mipsel",
    platform=PS1,
    cc=PS1_GCC,
)

GCC2952_MIPSEL = GCCPS1Compiler(
    id="gcc2.95.2-mipsel",
    platform=PS1,
    cc=PS1_GCC,
)

# Saturn
SATURN_CC = (
    'cat "$INPUT" | unix2dos > dos_src.c && '
    "cp -r ${COMPILER_DIR}/* . && "
    '(HOME="." dosemu -quiet -dumb -f ${COMPILER_DIR}/dosemurc -K . -E "CPP.EXE dos_src.c -o src_proc.c") && '
    '(HOME="." dosemu -quiet -dumb -f ${COMPILER_DIR}/dosemurc -K . -E "CC1.EXE -quiet ${COMPILER_FLAGS} src_proc.c -o cc1_out.asm") && '
    '(HOME="." dosemu -quiet -dumb -f ${COMPILER_DIR}/dosemurc -K . -E "AS.EXE cc1_out.asm -o as_out.o") && '
    "sh-elf-objcopy -Icoff-sh -Oelf32-sh as_out.o && "
    'cp as_out.o "$OUTPUT"'
)

CYGNUS_2_7_96Q3 = GCCSaturnCompiler(
    id="cygnus-2.7-96Q3",
    platform=SATURN,
    cc=SATURN_CC,
)

# PS2
EE_GCC29_990721 = GCCCompiler(
    id="ee-gcc2.9-990721",
    platform=PS2,
    cc='"${COMPILER_DIR}"/bin/ee-gcc -c -B "${COMPILER_DIR}"/bin/ee- $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC29_991111 = GCCCompiler(
    id="ee-gcc2.9-991111",
    platform=PS2,
    cc='${COMPILER_DIR}/bin/ee-gcc -c $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC29_991111A = GCCCompiler(
    id="ee-gcc2.9-991111a",
    platform=PS2,
    cc='${COMPILER_DIR}/bin/ee-gcc -c $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC29_991111_01 = GCCCompiler(
    id="ee-gcc2.9-991111-01",
    platform=PS2,
    cc='${COMPILER_DIR}/bin/ee-gcc -c $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC2952_273A = GCCCompiler(
    id="ee-gcc2.95.2-273a",
    platform=PS2,
    cc='${WINE} "${COMPILER_DIR}/bin/ee-gcc.exe" -c -B "${COMPILER_DIR}"/lib/gcc-lib/ee/2.95.2/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC2952_274 = GCCCompiler(
    id="ee-gcc2.95.2-274",
    platform=PS2,
    cc='${WINE} "${COMPILER_DIR}/bin/ee-gcc.exe" -c -B "${COMPILER_DIR}"/lib/gcc-lib/ee/2.95.2/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC2953_107 = GCCCompiler(
    id="ee-gcc2.95.3-107",
    platform=PS2,
    cc='${WINE} "${COMPILER_DIR}/bin/ee-gcc.exe" -c -B "${COMPILER_DIR}"/lib/gcc-lib/ee/2.95.3/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC2953_114 = GCCCompiler(
    id="ee-gcc2.95.3-114",
    platform=PS2,
    cc='${WINE} "${COMPILER_DIR}/bin/ee-gcc.exe" -c -B "${COMPILER_DIR}"/lib/gcc-lib/ee/2.95.3/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC2953_136 = GCCCompiler(
    id="ee-gcc2.95.3-136",
    platform=PS2,
    cc='${WINE} "${COMPILER_DIR}/bin/ee-gcc.exe" -c -B "${COMPILER_DIR}"/lib/gcc-lib/ee/2.95.3/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC296 = GCCCompiler(
    id="ee-gcc2.96",
    platform=PS2,
    cc='"${COMPILER_DIR}"/bin/ee-gcc -c -B "${COMPILER_DIR}"/bin/ee- $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

EE_GCC32_040921 = GCCCompiler(
    id="ee-gcc3.2-040921",
    platform=PS2,
    cc='"${COMPILER_DIR}"/bin/ee-gcc -c -B "${COMPILER_DIR}"/bin/ee- $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

MWCPS2_23_991202 = MWCCCompiler(
    id="mwcps2-2.3-991202",
    platform=PS2,
    cc='${WINE} "${COMPILER_DIR}/mwccmips.exe" -c $COMPILER_FLAGS -nostdinc -stderr "$INPUT" -o "$OUTPUT"',
)

MWCPS2_30B22_011126 = MWCCCompiler(
    id="mwcps2-3.0b22-011126",
    platform=PS2,
    cc='${WINE} "${COMPILER_DIR}/mwccps2.exe" -c $COMPILER_FLAGS -nostdinc -stderr "$INPUT" -o "$OUTPUT"',
)

MWCPS2_30B22_020123 = MWCCCompiler(
    id="mwcps2-3.0b22-020123",
    platform=PS2,
    cc='${WINE} "${COMPILER_DIR}/mwccps2.exe" -c $COMPILER_FLAGS -nostdinc -stderr "$INPUT" -o "$OUTPUT"',
)

MWCPS2_30B22_020716 = MWCCCompiler(
    id="mwcps2-3.0b22-020716",
    platform=PS2,
    cc='${WINE} "${COMPILER_DIR}/mwccps2.exe" -c $COMPILER_FLAGS -nostdinc -stderr "$INPUT" -o "$OUTPUT"',
)

MWCPS2_30B22_020926 = MWCCCompiler(
    id="mwcps2-3.0b22-020926",
    platform=PS2,
    cc='${WINE} "${COMPILER_DIR}/mwccps2.exe" -c $COMPILER_FLAGS -nostdinc -stderr "$INPUT" -o "$OUTPUT"',
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

GCC272SN = GCCCompiler(
    id="gcc2.7.2sn",
    platform=N64,
    cc='cpp -P "$INPUT" | ${WIBO} "${COMPILER_DIR}"/cc1n64.exe -quiet -G0 -mcpu=vr4300 -mips3 -mhard-float -meb ${COMPILER_FLAGS} -o "$OUTPUT".s && ${WIBO} "${COMPILER_DIR}"/asn64.exe -q -G0 "$OUTPUT".s -o "$OUTPUT".obj && "${COMPILER_DIR}"/psyq-obj-parser "$OUTPUT".obj -o "$OUTPUT" -b -n',
)

GCC272SNEW = GCCCompiler(
    id="gcc2.7.2snew",
    platform=N64,
    cc='"${COMPILER_DIR}"/cpp -lang-c -undef "$INPUT" | "${COMPILER_DIR}"/cc1 -mfp32 -mgp32 -G0 -quiet -mcpu=vr4300 -fno-exceptions ${COMPILER_FLAGS} -o "$OUTPUT".s && python3 "${COMPILER_DIR}"/modern-asn64.py mips-linux-gnu-as "$OUTPUT".s -G0 -EB -mips3 -O1 -mabi=32 -mgp32 -march=vr4300 -mfp32 -mno-shared -o "$OUTPUT"',
)

GCC281SN = GCCCompiler(
    id="gcc2.8.1sn",
    platform=N64,
    cc='cpp -E -lang-c -undef -D__GNUC__=2 -Dmips -D__mips__ -D__mips -Dn64 -D__n64__ -D__n64 -D_PSYQ -D__EXTENSIONS__ -D_MIPSEB -D__CHAR_UNSIGNED__ "$INPUT" '
    '| ${WIBO} "${COMPILER_DIR}"/cc1n64.exe ${COMPILER_FLAGS} -o "$OUTPUT".s '
    '&& ${WIBO} "${COMPILER_DIR}"/asn64.exe -q -G0 "$OUTPUT".s -o "$OUTPUT".obj '
    '&& "${COMPILER_DIR}"/psyq-obj-parser "$OUTPUT".obj -o "$OUTPUT" -b -n',
)

GCC281SNCXX = GCCCompiler(
    id="gcc2.8.1sn-cxx",
    base_compiler=GCC281SN,
    platform=N64,
    cc='cpp -E -lang-c++ -undef -D__GNUC__=2 -D__cplusplus -Dmips -D__mips__ -D__mips -Dn64 -D__n64__ -D__n64 -D_PSYQ -D__EXTENSIONS__ -D_MIPSEB -D__CHAR_UNSIGNED__ -D_LANGUAGE_C_PLUS_PLUS "$INPUT" '
    '| ${WIBO} "${COMPILER_DIR}"/cc1pln64.exe ${COMPILER_FLAGS} -o "$OUTPUT".s '
    '&& ${WIBO} "${COMPILER_DIR}"/asn64.exe -q -G0 "$OUTPUT".s -o "$OUTPUT".obj '
    '&& "${COMPILER_DIR}"/psyq-obj-parser "$OUTPUT".obj -o "$OUTPUT" -b -n',
)

EGCS1124 = GCCCompiler(
    id="egcs_1.1.2-4",
    platform=N64,
    cc='COMPILER_PATH="${COMPILER_DIR}" "${COMPILER_DIR}"/mips-linux-gcc -c -G 0 -fno-PIC -mgp32 -mfp32 -mcpu=4300 -nostdinc ${COMPILER_FLAGS} "${INPUT}" -o "${OUTPUT}"',
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
    cc='USR_LIB="${COMPILER_DIR}" "${COMPILER_DIR}/cc" -c -Xcpluscomm -G0 -non_shared ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
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

MWCC_233_144 = MWCCCompiler(
    id="mwcc_233_144",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_233_159 = MWCCCompiler(
    id="mwcc_233_159",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)
MWCC_233_163 = MWCCCompiler(
    id="mwcc_233_163",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_233_163E = MWCCCompiler(
    id="mwcc_233_163e",
    platform=GC_WII,
    cc='${WIBO} "${COMPILER_DIR}/mwcceppc.125.exe" -c -proc gekko -nostdinc -stderr ${COMPILER_FLAGS} -o "${OUTPUT}.1" "${INPUT}" && ${WIBO} "${COMPILER_DIR}/mwcceppc.exe" -c -proc gekko -nostdinc -stderr ${COMPILER_FLAGS} -o "${OUTPUT}.2" "${INPUT}" && python3 "${COMPILER_DIR}/frank.py" "${OUTPUT}.1" "${OUTPUT}.2" "${OUTPUT}"',
)

MWCC_233_163N = MWCCCompiler(
    id="mwcc_233_163n",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_242_81 = MWCCCompiler(
    id="mwcc_242_81",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_242_81R = MWCCCompiler(
    id="mwcc_242_81r",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_247_92 = MWCCCompiler(
    id="mwcc_247_92",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_247_105 = MWCCCompiler(
    id="mwcc_247_105",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_247_107 = MWCCCompiler(
    id="mwcc_247_107",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_247_108 = MWCCCompiler(
    id="mwcc_247_108",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_41_60831 = MWCCCompiler(
    id="mwcc_41_60831",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_41_60126 = MWCCCompiler(
    id="mwcc_41_60126",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_42_127 = MWCCCompiler(
    id="mwcc_42_127",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_42_142 = MWCCCompiler(
    id="mwcc_42_142",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_43_151 = MWCCCompiler(
    id="mwcc_43_151",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_43_172 = MWCCCompiler(
    id="mwcc_43_172",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

MWCC_43_213 = MWCCCompiler(
    id="mwcc_43_213",
    platform=GC_WII,
    cc=MWCCEPPC_CC,
)

# NDS_ARM9
MWCCARM_CC = '${WINE} "${COMPILER_DIR}/mwccarm.exe" -pragma "msg_show_realref off" -c -proc arm946e -nostdinc -stderr ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"'

MWCC_20_72 = MWCCCompiler(
    id="mwcc_20_72",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_20_79 = MWCCCompiler(
    id="mwcc_20_79",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_20_82 = MWCCCompiler(
    id="mwcc_20_82",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_20_84 = MWCCCompiler(
    id="mwcc_20_84",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_20_87 = MWCCCompiler(
    id="mwcc_20_87",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_30_114 = MWCCCompiler(
    id="mwcc_30_114",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_30_123 = MWCCCompiler(
    id="mwcc_30_123",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_30_126 = MWCCCompiler(
    id="mwcc_30_126",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_30_131 = MWCCCompiler(
    id="mwcc_30_131",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_30_133 = MWCCCompiler(
    id="mwcc_30_133",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_30_134 = MWCCCompiler(
    id="mwcc_30_134",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_30_136 = MWCCCompiler(
    id="mwcc_30_136",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_30_137 = MWCCCompiler(
    id="mwcc_30_137",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_30_138 = MWCCCompiler(
    id="mwcc_30_138",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_30_139 = MWCCCompiler(
    id="mwcc_30_139",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_40_1018 = MWCCCompiler(
    id="mwcc_40_1018",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_40_1024 = MWCCCompiler(
    id="mwcc_40_1024",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_40_1026 = MWCCCompiler(
    id="mwcc_40_1026",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_40_1027 = MWCCCompiler(
    id="mwcc_40_1027",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_40_1028 = MWCCCompiler(
    id="mwcc_40_1028",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_40_1034 = MWCCCompiler(
    id="mwcc_40_1034",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_40_1036 = MWCCCompiler(
    id="mwcc_40_1036",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

MWCC_40_1051 = MWCCCompiler(
    id="mwcc_40_1051",
    platform=NDS_ARM9,
    cc=MWCCARM_CC,
)

CL_WIN = '${WINE} "${COMPILER_DIR}"/Bin/CL.EXE /c /nologo /IZ:"${COMPILER_DIR}"/Include/ ${COMPILER_FLAGS} /Fd"Z:/tmp/" /Bk"Z:/tmp/" /Fo"Z:${OUTPUT}" "Z:${INPUT}"'

MSVC40 = MSVCCompiler(
    id="msvc4.0",
    platform=WIN9X,
    cc=CL_WIN,
)

MSVC42 = MSVCCompiler(
    id="msvc4.2",
    platform=WIN9X,
    cc=CL_WIN,
)

MSVC60 = MSVCCompiler(
    id="msvc6.0",
    platform=WIN9X,
    cc=CL_WIN,
)

MSVC63 = MSVCCompiler(
    id="msvc6.3",
    platform=WIN9X,
    cc=CL_WIN,
)

MSVC64 = MSVCCompiler(
    id="msvc6.4",
    platform=WIN9X,
    cc=CL_WIN,
)

MSVC65 = MSVCCompiler(
    id="msvc6.5",
    platform=WIN9X,
    cc=CL_WIN,
)

MSVC65PP = MSVCCompiler(
    id="msvc6.5pp",
    platform=WIN9X,
    cc=CL_WIN,
)

MSVC66 = MSVCCompiler(
    id="msvc6.6",
    platform=WIN9X,
    cc=CL_WIN,
)

MSVC70 = MSVCCompiler(
    id="msvc7.0",
    platform=WIN9X,
    cc=CL_WIN,
)

MSVC71 = MSVCCompiler(
    id="msvc7.1",
    platform=WIN9X,
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
    PSYQ33,
    PSYQ35,
    PSYQ36,
    PSYQ40,
    PSYQ41,
    PSYQ43,
    PSYQ44,
    PSYQ45,
    PSYQ46,
    GCC263_PSX,
    GCC260_MIPSEL,
    GCC263_MIPSEL,
    GCC270_MIPSEL,
    GCC271_MIPSEL,
    GCC272_MIPSEL,
    GCC2721_MIPSEL,
    GCC2722_MIPSEL,
    GCC2723_MIPSEL,
    GCC280_MIPSEL,
    GCC281_MIPSEL,
    GCC29166_MIPSEL,
    GCC2952_MIPSEL,
    # Saturn
    CYGNUS_2_7_96Q3,
    # PS2
    EE_GCC29_990721,
    EE_GCC29_991111,
    EE_GCC29_991111A,
    EE_GCC29_991111_01,
    EE_GCC2952_273A,
    EE_GCC2952_274,
    EE_GCC2953_107,
    EE_GCC2953_114,
    EE_GCC2953_136,
    EE_GCC296,
    EE_GCC32_040921,
    MWCPS2_23_991202,
    MWCPS2_30B22_011126,
    MWCPS2_30B22_020123,
    MWCPS2_30B22_020716,
    MWCPS2_30B22_020926,
    # N64
    IDO53,
    IDO53_CXX,
    IDO60,
    IDO71,
    MIPS_PRO_744,
    GCC272KMC,
    GCC272SN,
    GCC272SNEW,
    GCC281PM,
    GCC281SN,
    GCC281SNCXX,
    EGCS1124,
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
    MWCC_233_163,
    MWCC_233_163E,
    MWCC_233_163N,
    MWCC_242_81,
    MWCC_242_81R,
    MWCC_247_92,
    MWCC_247_105,
    MWCC_247_107,
    MWCC_247_108,
    MWCC_41_60831,
    MWCC_41_60126,
    MWCC_42_127,
    MWCC_42_142,
    MWCC_43_151,
    MWCC_43_172,
    MWCC_43_213,
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
    # WIN9X
    MSVC40,
    MSVC42,
    MSVC60,
    MSVC63,
    MSVC64,
    MSVC65,
    MSVC65PP,
    MSVC66,
    MSVC70,
    MSVC71,
    # Watcom, DOS and Win9x
    WATCOM_105_C,
    WATCOM_105_CPP,
    WATCOM_105A_C,
    WATCOM_105A_CPP,
    WATCOM_106_C,
    WATCOM_106_CPP,
    WATCOM_110_C,
    WATCOM_110_CPP,
]

# MKWII Common flags
MKW_SHARED = "-nodefaults -align powerpc -enc SJIS -proc gekko -enum int -O4,p -inline auto -W all -fp hardware -W noimplicitconv -w notinlined -w nounwanted -DREVOKART -Cpp_exceptions off -RTTI off -nostdinc -msgstyle gcc -func_align 4 -sym dwarf-2"

# SPM Common flags
SPM_SHARED = "-enc SJIS -lang c++ -W all -fp fmadd -Cpp_exceptions off -O4 -use_lmw_stmw on -str pool -rostr -sym on -ipa file"

# Rat Proto Common flags
RAT_SHARED = '-fp_contract on -pool off -RTTI off -nodefaults -Cpp_exceptions off -schedule on -lang=c++ -char signed -str reuse,pool,readonly -fp fmadd -use_lmw_stmw on -pragma "cpp_extensions on" -sym on -enum int -inline off'

_compilers = OrderedDict({c.id: c for c in _all_compilers if c.available()})

logger.info(f"Enabled {len(_compilers)} compiler(s): {', '.join(_compilers.keys())}")
logger.info(
    f"Available platform(s): {', '.join([platform.id for platform in available_platforms()])}"
)
