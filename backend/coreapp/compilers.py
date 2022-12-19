import enum
import logging
from dataclasses import dataclass, field
from functools import cache
from pathlib import Path
from typing import ClassVar, Dict, List, Optional, OrderedDict

from django.conf import settings

from coreapp import platforms
from coreapp.flags import (
    COMMON_ARMCC_FLAGS,
    COMMON_CLANG_FLAGS,
    COMMON_GCC_FLAGS,
    COMMON_GCC_PS1_FLAGS,
    COMMON_IDO_FLAGS,
    COMMON_MWCC_FLAGS,
    Flags,
)

from coreapp.platforms import (
    GBA,
    GC_WII,
    IRIX,
    MACOS9,
    MACOSX,
    N3DS,
    N64,
    NDS_ARM9,
    Platform,
    PS1,
    PS2,
    SWITCH,
)

logger = logging.getLogger(__name__)

CONFIG_PY = "config.py"
COMPILER_BASE_PATH: Path = settings.COMPILER_BASE_PATH


class Language(enum.Enum):
    C = "C"
    CXX = "C++"
    PASCAL = "Pascal"

    def get_file_extension(self) -> str:
        return {
            Language.C: "c",
            Language.CXX: "cpp",
            Language.PASCAL: "p",
        }[self]


@dataclass(frozen=True)
class Compiler:
    id: str
    cc: str
    platform: Platform
    flags: ClassVar[Flags]
    base_id: Optional[str] = None
    is_gcc: ClassVar[bool] = False
    is_ido: ClassVar[bool] = False
    is_mwcc: ClassVar[bool] = False
    needs_wine = False
    language: Language = Language.C

    @property
    def path(self) -> Path:
        return COMPILER_BASE_PATH / (self.base_id or self.id)

    def available(self) -> bool:
        # consider compiler binaries present if the compiler's directory is found
        return self.path.exists()


@dataclass(frozen=True)
class Preset:
    name: str
    compiler: Compiler
    flags: str
    diff_flags: List[str] = field(default_factory=list)

    def to_json(self) -> Dict[str, object]:
        return {
            "name": self.name,
            "compiler": self.compiler.id,
            "flags": self.flags,
            "diff_flags": self.diff_flags,
        }


@dataclass(frozen=True)
class DummyCompiler(Compiler):
    flags: ClassVar[Flags] = []

    def available(self) -> bool:
        return settings.DUMMY_COMPILER


@dataclass(frozen=True)
class ClangCompiler(Compiler):
    flags: ClassVar[Flags] = COMMON_CLANG_FLAGS


@dataclass(frozen=True)
class ArmccCompiler(Compiler):
    flags: ClassVar[Flags] = COMMON_ARMCC_FLAGS


@dataclass(frozen=True)
class GCCCompiler(Compiler):
    is_gcc: ClassVar[bool] = True
    flags: ClassVar[Flags] = COMMON_GCC_FLAGS


@dataclass(frozen=True)
class GCCPS1Compiler(GCCCompiler):
    flags: ClassVar[Flags] = COMMON_GCC_PS1_FLAGS


@dataclass(frozen=True)
class IDOCompiler(Compiler):
    is_ido: ClassVar[bool] = True
    flags: ClassVar[Flags] = COMMON_IDO_FLAGS


@dataclass(frozen=True)
class MWCCCompiler(Compiler):
    is_mwcc: ClassVar[bool] = True
    flags: ClassVar[Flags] = COMMON_MWCC_FLAGS


def from_id(compiler_id: str) -> Compiler:
    if compiler_id not in _compilers:
        raise ValueError(f"Unknown compiler: {compiler_id}")
    return _compilers[compiler_id]


@cache
def available_compilers() -> List[Compiler]:
    return list(_compilers.values())


@cache
def available_platforms() -> List[Platform]:
    pset = set(compiler.platform for compiler in available_compilers())

    # Disable MACOS9 for now, as it's not working properly
    if MACOS9 in pset:
        pset.remove(MACOS9)

    return sorted(pset, key=lambda p: p.name)


@cache
def available_presets(platform: Platform) -> List[Preset]:
    return [p for p in _presets if p.compiler.platform == platform]


def preset_from_name(name: str) -> Optional[Preset]:
    for p in _presets:
        if p.name == name:
            return p
    return None


DUMMY = DummyCompiler(id="dummy", platform=platforms.DUMMY, cc="")

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
    base_id="agbcc",
)

AGBCCPP = GCCCompiler(
    id="agbccpp",
    platform=GBA,
    cc='cc -E -I "${COMPILER_DIR}"/include -iquote include -nostdinc -undef "$INPUT" | "${COMPILER_DIR}"/bin/agbcp -quiet $COMPILER_FLAGS -o - | arm-none-eabi-as -mcpu=arm7tdmi -o "$OUTPUT"',
)
# N3DS
ARMCC_CC = '${WINE} "${COMPILER_DIR}"/bin/armcc.exe -c --cpu=MPCore --fpmode=fast --apcs=/interwork -I "${COMPILER_DIR}"/include $COMPILER_FLAGS -o "${OUTPUT}" "${INPUT}"'

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
    cc='TOOLROOT="$COMPILER_DIR" "$COMPILER_DIR"/bin/clang++ -target aarch64-linux-elf --sysroot="$COMPILER_DIR"/botw-lib-musl-25ed8669943bee65a650700d340e451eda2a26ba -D_LIBCPP_HAS_MUSL_LIBC -fuse-ld=lld -mcpu=cortex-a57+fp+simd+crypto+crc -mno-implicit-float -fstandalone-debug -fPIC -Wl,-Bsymbolic-functions -shared -stdlib=libc++ -nostdlib $COMPILER_FLAGS -o "$OUTPUT" "$INPUT"',
)

CLANG_401 = ClangCompiler(
    id="clang-4.0.1",
    platform=SWITCH,
    cc='TOOLROOT="$COMPILER_DIR" "$COMPILER_DIR"/bin/clang++ -target aarch64-linux-elf --sysroot="$COMPILER_DIR"/botw-lib-musl-25ed8669943bee65a650700d340e451eda2a26ba -fuse-ld=lld -mcpu=cortex-a57+fp+simd+crypto+crc -mno-implicit-float -fstandalone-debug -fPIC -Wl,-Bsymbolic-functions -shared -stdlib=libc++ -nostdlib $COMPILER_FLAGS -o "$OUTPUT" "$INPUT"',
)

# PS1
GCC263_MIPSEL = GCCPS1Compiler(
    id="gcc2.6.3-mipsel",
    platform=PS1,
    cc='mips-linux-gnu-cpp -Wall -lang-c -gstabs "$INPUT" | "${COMPILER_DIR}"/cc1 -mips1 -mcpu=3000 $COMPILER_FLAGS | mips-linux-gnu-as -march=r3000 -mtune=r3000 -no-pad-sections -O1 -o "$OUTPUT"',
)

PSYQ_CC = 'cpp -P "$INPUT" | unix2dos | ${WINE} ${COMPILER_DIR}/CC1PSX.EXE -quiet ${COMPILER_FLAGS} -o "$OUTPUT".s && ${WINE} ${COMPILER_DIR}/ASPSX.EXE -quiet "$OUTPUT".s -o "$OUTPUT".obj && ${COMPILER_DIR}/psyq-obj-parser "$OUTPUT".obj -o "$OUTPUT"'

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

# PS2
EE_GCC296 = GCCCompiler(
    id="ee-gcc2.96",
    platform=PS2,
    cc='"${COMPILER_DIR}"/bin/ee-gcc -c -B "${COMPILER_DIR}"/bin/ee- $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

# IRIX
IDO53_IRIX = IDOCompiler(
    id="ido5.3_irix",
    platform=IRIX,
    cc='IDO_CC="${COMPILER_DIR}/cc" "${COMPILER_DIR}/cc" -c -Xcpluscomm -G0 -non_shared -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
    base_id="ido5.3",
)

IDO71_IRIX = IDOCompiler(
    id="ido7.1_irix",
    platform=IRIX,
    cc='IDO_CC="${COMPILER_DIR}/cc" "${COMPILER_DIR}/cc" -c -Xcpluscomm -G0 -non_shared -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
    base_id="ido7.1",
)

IDO71PASCAL = IDOCompiler(
    id="ido7.1Pascal",
    platform=IRIX,
    cc='IDO_CC="${COMPILER_DIR}/cc" "${COMPILER_DIR}/cc" -c -Xcpluscomm -G0 -non_shared ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
    base_id="ido7.1",
    language=Language.PASCAL,
)

# N64
IDO53 = IDOCompiler(
    id="ido5.3",
    platform=N64,
    cc='IDO_CC="${COMPILER_DIR}/cc" "${COMPILER_DIR}/cc" -c -Xcpluscomm -G0 -non_shared -Wab,-r4300_mul -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
)

IDO71 = IDOCompiler(
    id="ido7.1",
    platform=N64,
    cc='IDO_CC="${COMPILER_DIR}/cc" "${COMPILER_DIR}/cc" -c -Xcpluscomm -G0 -non_shared -Wab,-r4300_mul -woff 649,838,712 -32 ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"',
)

GCC272KMC = GCCCompiler(
    id="gcc2.7.2kmc",
    platform=N64,
    cc='COMPILER_PATH="${COMPILER_DIR}" "${COMPILER_DIR}"/gcc -c -G0 -mgp32 -mfp32 ${COMPILER_FLAGS} "${INPUT}" -o "${OUTPUT}"',
)

GCC281 = GCCCompiler(
    id="gcc2.8.1",
    platform=N64,
    cc='"${COMPILER_DIR}"/gcc -G0 -c -B "${COMPILER_DIR}"/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

GCC272SN = GCCCompiler(
    id="gcc2.7.2sn",
    platform=N64,
    cc='cpp -P "$INPUT" | ${WINE} "${COMPILER_DIR}"/cc1n64.exe -quiet -G0 -mcpu=vr4300 -mips3 -mhard-float -meb ${COMPILER_FLAGS} -o "$OUTPUT".s && ${WINE} "${COMPILER_DIR}"/asn64.exe -q -G0 "$OUTPUT".s -o "$OUTPUT".obj && "${COMPILER_DIR}"/psyq-obj-parser "$OUTPUT".obj -o "$OUTPUT" -b -n',
)

GCC272SNEW = GCCCompiler(
    id="gcc2.7.2snew",
    platform=N64,
    cc='"${COMPILER_DIR}"/cpp -lang-c -undef "$INPUT" | "${COMPILER_DIR}"/cc1 -mfp32 -mgp32 -G0 -quiet -mcpu=vr4300 -fno-exceptions ${COMPILER_FLAGS} -o "$OUTPUT".s && python3 "${COMPILER_DIR}"/modern-asn64.py mips-linux-gnu-as "$OUTPUT".s -G0 -EB -mips3 -O1 -mabi=32 -mgp32 -march=vr4300 -mfp32 -mno-shared -o "$OUTPUT"',
)

GCC281SNCXX = GCCCompiler(
    id="gcc2.8.1sn-cxx",
    base_id="gcc2.8.1sn",
    platform=N64,
    cc='cpp -E -lang-c++ -undef -D__GNUC__=2 -D__cplusplus -Dmips -D__mips__ -D__mips -Dn64 -D__n64__ -D__n64 -D_PSYQ -D__EXTENSIONS__ -D_MIPSEB -D__CHAR_UNSIGNED__ -D_LANGUAGE_C_PLUS_PLUS "$INPUT" '
    '| ${WINE} "${COMPILER_DIR}"/cc1pln64.exe ${COMPILER_FLAGS} -o "$OUTPUT".s '
    '&& ${WINE} "${COMPILER_DIR}"/asn64.exe -q -G0 "$OUTPUT".s -o "$OUTPUT".obj '
    '&& "${COMPILER_DIR}"/psyq-obj-parser "$OUTPUT".obj -o "$OUTPUT" -b -n',
)

# MACOS9
MWCPPC_CC = 'printf "%s" "${COMPILER_FLAGS}" | xargs -x -- ${WINE} "${COMPILER_DIR}/MWCPPC.exe" -o object.o "${INPUT}" && printf "%s" "-dis -h -module ".${FUNCTION}" -nonames -nodata" | xargs -x -- ${WINE} "${COMPILER_DIR}/MWLinkPPC.exe" "${OUTPUT}" > "${OUTPUT}.s" && python3 ${COMPILER_DIR}/convert_gas_syntax.py "${OUTPUT}.s" ".${FUNCTION}" > "${OUTPUT}_new.s" && powerpc-linux-gnu-as "${OUTPUT}_new.s" -o "${OUTPUT}"'

MWCPPC_23 = MWCCCompiler(
    id="mwcppc_23",
    platform=MACOS9,
    cc=MWCPPC_CC,
)

MWCPPC_24 = MWCCCompiler(
    id="mwcppc_24",
    platform=MACOS9,
    cc=MWCPPC_CC,
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
)

PBX_GCC3 = GCCCompiler(
    id="gcc3-1041",
    platform=MACOSX,
    cc=GCC_CC1_ALT,
)

# GC_WII
# Thanks to Gordon Davisson for the xargs trick:
# https://superuser.com/questions/1529226/get-bash-to-respect-quotes-when-word-splitting-subshell-output/1529316#1529316
MWCCEPPC_CC = 'printf "%s" "${COMPILER_FLAGS}" | xargs -x -- ${WINE} "${COMPILER_DIR}/mwcceppc.exe" -c -proc gekko -nostdinc -stderr -o "${OUTPUT}" "${INPUT}"'

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
    cc='${WINE} "${COMPILER_DIR}/mwcceppc.125.exe" -c -proc gekko -nostdinc -stderr ${COMPILER_FLAGS} -o "${OUTPUT}.1" "${INPUT}" && ${WINE} "${COMPILER_DIR}/mwcceppc.exe" -c -proc gekko -nostdinc -stderr ${COMPILER_FLAGS} -o "${OUTPUT}.2" "${INPUT}" && python3 "${COMPILER_DIR}/frank.py" "${OUTPUT}.1" "${OUTPUT}.2" "${OUTPUT}"',
)

MWCC_242_81 = MWCCCompiler(
    id="mwcc_242_81",
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


_all_compilers: List[Compiler] = [
    DUMMY,
    # GBA
    AGBCC,
    OLD_AGBCC,
    AGBCCPP,
    # N3DS
    ARMCC_40_771,
    ARMCC_40_821,
    ARMCC_41_561,
    ARMCC_41_713,
    ARMCC_41_894,
    ARMCC_41_921,
    ARMCC_41_1049,
    ARMCC_41_1440,
    ARMCC_41_1454,
    ARMCC_504_82,
    # Switch
    CLANG_391,
    CLANG_401,
    # PS1
    GCC263_MIPSEL,
    PSYQ40,
    PSYQ41,
    PSYQ43,
    PSYQ45,
    PSYQ46,
    # PS2
    EE_GCC296,
    # N64
    IDO53,
    IDO71,
    GCC272KMC,
    GCC272SN,
    GCC272SNEW,
    GCC281,
    GCC281SNCXX,
    # IRIX
    IDO53_IRIX,
    IDO71_IRIX,
    IDO71PASCAL,
    # GC_WII
    MWCC_233_144,
    MWCC_233_159,
    MWCC_233_163,
    MWCC_233_163E,
    MWCC_242_81,
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
    # MACOS9
    MWCPPC_23,
    MWCPPC_24,
    # MACOSX
    XCODE_GCC401_C,
    XCODE_GCC401_CPP,
    XCODE_24_C,
    XCODE_24_CPP,
    XCODE_GCC400_C,
    XCODE_GCC400_CPP,
    PBX_GCC3,
]

# MKWII Common flags
MKW_SHARED = "-nodefaults -align powerpc -enc SJIS -proc gekko -enum int -O4,p -inline auto -W all -fp hardware -W noimplicitconv -w notinlined -w nounwanted -DREVOKART -Cpp_exceptions off -RTTI off -nostdinc -msgstyle gcc -func_align 4 -sym dwarf-2"

# SPM Common flags
SPM_SHARED = "-enc SJIS -lang c99 -W all -fp fmadd -Cpp_exceptions off -O4 -use_lmw_stmw on -str pool -rostr -sym on -ipa file"

_all_presets = [
    # GBA
    Preset(
        "Rhythm Tengoku",
        AGBCC,
        "-mthumb-interwork -Wparentheses -O2 -fhex-asm",
    ),
    Preset(
        "The Minish Cap",
        AGBCC,
        "-O2 -Wimplicit -Wparentheses -Werror -Wno-multichar -g3",
    ),
    Preset(
        "Mother 3",
        AGBCCPP,
        "-fno-exceptions -fno-rtti -fhex-asm -mthumb-interwork -Wimplicit -Wparentheses -O2 -g3",
    ),
    Preset(
        "Kirby and the Amazing Mirror",
        AGBCC,
        "-mthumb-interwork -Wimplicit -Wparentheses -Werror -O2 -g -fhex-asm",
    ),
    # N3DS
    Preset(
        "Ocarina of Time 3D",
        ARMCC_40_821,
        "--cpp --arm --split_sections --debug --no_debug_macros --gnu --debug_info=line_inlining_extensions -O3 -Otime --data_reorder --signed_chars --multibyte_chars --remove_unneeded_entities --force_new_nothrow --remarks --no_rtti",
    ),
    Preset(
        "Super Mario 3D Land",
        ARMCC_41_894,
        "--cpp --arm -Otime --no_rtti_data --no_rtti --no_exceptions --vfe --data_reorder --signed_chars --multibyte_chars --locale=japanese --force_new_nothrow --remarks",
    ),
    # Switch
    Preset(
        "Super Mario Odyssey",
        CLANG_391,
        "-x c++ -O3 -g2 -std=c++1z -fno-rtti -fno-exceptions -Wall -Wextra -Wdeprecated -Wno-unused-parameter -Wno-unused-private-field -fno-strict-aliasing -Wno-invalid-offsetof -D SWITCH -D NNSDK -D MATCHING_HACK_NX_CLANG",
    ),
    Preset(
        "Breath of the Wild",
        CLANG_401,
        "-x c++ -O3 -g2 -std=c++1z -fno-rtti -fno-exceptions -Wall -Wextra -Wdeprecated -Wno-unused-parameter -Wno-unused-private-field -fno-strict-aliasing -Wno-invalid-offsetof -D SWITCH -D NNSDK -D MATCHING_HACK_NX_CLANG",
    ),
    # PS1
    Preset(
        "Castlevania: Symphony of the Night",
        GCC263_MIPSEL,
        "-O2 -G0 -funsigned-char",
    ),
    Preset(
        "Evo's Space Adventures",
        PSYQ46,
        "-O2",
    ),
    Preset(
        "Legacy of Kain: Soul Reaver",
        PSYQ45,
        "-g -Wall -O2 -G256",
    ),
    Preset(
        "Metal Gear Solid",
        PSYQ43,
        "-O2 -G8",
    ),
    # N64
    Preset(
        "Chameleon Twist 1",
        IDO53,
        "-O2 -mips2",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "Chameleon Twist 2",
        IDO53,
        "-O2 -mips2",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset("Diddy Kong Racing", IDO53, "-O2 -mips1"),
    Preset("Dinosaur Planet", IDO53, "-O2 -g3 -mips2"),
    Preset("Dinosaur Planet (DLLs)", IDO53, "-O2 -g3 -mips2 -KPIC"),
    Preset("Dr. Mario 64", GCC272KMC, "-O2 -mips3", diff_flags=["-Mreg-names=32"]),
    Preset("GoldenEye / Perfect Dark", IDO53, "-Olimit 2000 -mips2 -O2"),
    Preset(
        "Majora's Mask",
        IDO71,
        "-O2 -g3 -mips2 -woff 624",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset("AeroGauge", IDO53, "-O2 -mips2"),
    Preset("Mario Kart 64", IDO53, "-O2 -mips2"),
    Preset(
        "Mario Party 1",
        GCC272KMC,
        "-O1 -mips3",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "Mario Party 2",
        GCC272KMC,
        "-O1 -mips3",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "Mario Party 3",
        GCC272KMC,
        "-O1 -mips3",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "Ocarina of Time",
        IDO71,
        "-O2 -mips2",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "Paper Mario",
        GCC281,
        "-O2 -fforce-addr -gdwarf-2",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "Quest64",
        IDO53,
        "-O2 -g3 -mips2",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "Rocket Robot on Wheels",
        GCC272SNEW,
        "-mips2 -O2 -gdwarf -funsigned-char",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "Space Station Silicon Valley",
        IDO53,
        "-O2 -mips2 -Xfullwarn -signed -nostdinc",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "Super Mario 64",
        IDO53,
        "-O1 -g -mips2",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "Duke Nukem Zero Hour",
        GCC272KMC,
        "-O2 -g2 -mips3",
        diff_flags=["-Mreg-names=32"],
    ),
    # IRIX
    Preset(
        "IDO 5.3 cc",
        IDO53_IRIX,
        "-KPIC -mips1 -O1 -fullwarn",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "IDO 5.3 libraries",
        IDO53_IRIX,
        "-KPIC -mips1 -O2 -fullwarn",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "IDO 7.1 cc",
        IDO71_IRIX,
        "-KPIC -mips2 -O1 -fullwarn",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "IDO 7.1 libraries",
        IDO71_IRIX,
        "-KPIC -mips2 -O2 -fullwarn",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "IDO 7.1 Pascal",
        IDO71PASCAL,
        "-KPIC -mips2 -O2 -fullwarn",
        diff_flags=["-Mreg-names=32"],
    ),
    Preset(
        "7.1 N64 SDK",
        IDO71_IRIX,
        "-KPIC -mips2 -g -fullwarn",
        diff_flags=["-Mreg-names=32"],
    ),
    # GC_WII
    Preset(
        "Super Monkey Ball",
        MWCC_233_159,
        "-O4,p -nodefaults -fp hard -Cpp_exceptions off -enum int -inline auto",
    ),
    Preset(
        "Super Mario Sunshine",
        MWCC_233_163,
        "-lang=c++ -Cpp_exceptions off -fp hard -O4 -nodefaults -enum int -rostr",
    ),
    Preset(
        "Pikmin",
        MWCC_233_163E,
        "-lang=c++ -nodefaults -Cpp_exceptions off -RTTI on -fp hard -O4,p -common on",
    ),
    Preset(
        "Super Smash Bros. Melee",
        MWCC_233_163E,
        "-O4,p -nodefaults -fp hard -Cpp_exceptions off -enum int -fp_contract on -inline auto",
    ),
    Preset(
        "Kirby Air Ride",
        MWCC_242_81,
        "-O4,p -nodefaults -fp hard -Cpp_exceptions off -enum int -fp_contract on -inline auto",
    ),
    Preset(
        "Battle for Bikini Bottom",
        MWCC_247_92,
        "-lang=c++ -g -Cpp_exceptions off -RTTI off -fp hard -fp_contract on -O4,p -maxerrors 1 -str reuse,pool,readonly -char unsigned -enum int -use_lmw_stmw on -inline off",
    ),
    Preset(
        "Mario Kart: Double Dash",
        MWCC_247_105,
        "-lang=c++ -use_lmw_stmw on -inline on -O4 -char signed -Cpp_exceptions off -fp_contract on -fp fmadd -enum int",
    ),
    Preset(
        "Pikmin 2",
        MWCC_247_107,
        "-lang=c++ -nodefaults -Cpp_exceptions off -RTTI off -fp hard -fp_contract on -rostr -O4,p -use_lmw_stmw on -enum int -inline auto -sdata 8 -sdata2 8 -common on",
    ),
    Preset(
        "The Thousand-Year Door",
        MWCC_247_108,
        "-fp hard -fp_contract on -enum int -O4,p -sdata 48 -sdata2 6 -rostr -multibyte -use_lmw_stmw on -inline deferred -Cpp_exceptions off",
    ),
    Preset(
        "Twilight Princess",
        MWCC_247_108,
        "-lang=c++ -Cpp_exceptions off -nodefaults -O3 -fp hard -msgstyle gcc -str pool,readonly,reuse -RTTI off -maxerrors 1 -enum int",
    ),
    Preset(
        "Super Paper Mario (DOL)",
        MWCC_41_60831,
        f"{SPM_SHARED} -inline all -sdata 4 -sdata2 4",
    ),
    Preset(
        "Super Paper Mario (REL)",
        MWCC_41_60831,
        f"{SPM_SHARED} -sdata 0 -sdata2 0 -pool off -ordered-fp-compares",
    ),
    Preset(
        "Wii Sports",
        MWCC_41_60831,
        "-lang=c++ -enum int -inline auto -Cpp_exceptions off -RTTI off -fp hard -O4,p -nodefaults",
    ),
    Preset(
        "Super Mario Galaxy",
        MWCC_41_60126,
        "-Cpp_exceptions off -stdinc -nodefaults -fp hard -lang=c++ -inline auto,level=2 -ipa file -O4,s -rtti off -sdata 4 -sdata2 4 -enum int",
    ),
    Preset(
        "Xenoblade Chronicles (JP)",
        MWCC_43_151,
        "-lang=c++ -Cpp_exceptions off -enum int -inline on -RTTI on -fp hard -str pool,readonly,reuse -O4,p -nodefaults -use_lmw_stmw on -func_align 4",
    ),
    Preset(
        "Xenoblade Chronicles (JP) (Wii SDK)",
        MWCC_43_151,
        "-lang=c99 -enum int -inline auto -ipa file -proc gekko -fp hard -str pool -O4,p -nodefaults -func_align 16",
    ),
    Preset(
        "Mario Party 4",
        MWCC_242_81,
        "-O0,p -str pool -fp hard -Cpp_exceptions off",
    ),
    Preset(
        "Mario Kart Wii (DOL)",
        MWCC_42_127,
        f"{MKW_SHARED} -lang=c++ -ipa file -rostr -sdata 0 -sdata2 0",
    ),
    Preset(
        "Mario Kart Wii (RVL_SDK)",
        MWCC_41_60831,
        f"{MKW_SHARED} -lang=c99 -ipa file",
    ),
    Preset(
        "Mario Kart Wii (MSL)",
        MWCC_42_127,
        f"{MKW_SHARED} -lang=c99 -ipa file",
    ),
    Preset(
        "Mario Kart Wii (NintendoWare)",
        MWCC_42_127,
        f'{MKW_SHARED} -lang=c++ -ipa file -inline auto -O4,p -pragma "legacy_struct_alignment on"',
    ),
    Preset(
        "Mario Kart Wii (DWC/GameSpy)",
        MWCC_41_60831,
        f"{MKW_SHARED} -lang=c99 -ipa file -w nounusedexpr -w nounusedarg",
    ),
    Preset(
        "Mario Kart Wii (EGG)",
        MWCC_42_127,
        f"{MKW_SHARED} -lang=c++ -ipa function -rostr",
    ),
    Preset(
        "Mario Kart Wii (REL)",
        MWCC_42_127,
        f'{MKW_SHARED} -lang=c++ -ipa file -rostr -sdata 0 -sdata2 0 -use_lmw_stmw=on -pragma "legacy_struct_alignment on"',
    ),
    Preset(
        "Metroid Prime (USA)",
        MWCC_242_81,
        "-lang=c++ -nodefaults -Cpp_exceptions off -RTTI off -fp hard -fp_contract on -str reuse,pool,readonly -rostr -O4,p -maxerrors 1 -use_lmw_stmw on -enum int -inline deferred,noauto -common on",
    ),
    # NDS
    Preset(
        "Pokémon Diamond / Pearl",
        MWCC_30_123,
        "-O4,p -proc arm946e -gccext,on -fp soft -lang c99 -Cpp_exceptions off -interworking -enum int",
    ),
    Preset(
        "Pokémon HeartGold / SoulSilver",
        MWCC_30_137,
        "-O4,p -enum int -lang c99 -Cpp_exceptions off -gccext,on -gccinc -interworking -gccdep -MD",
    ),
    # MACOS9
    Preset("The Sims", MWCPPC_24, "-lang=c++ -O3 -str pool -g"),
    # MACOSX
    Preset("Fallout 2", PBX_GCC3, "-std=c99 -fPIC -O1 -g3"),
    Preset("The Sims 2", XCODE_GCC400_CPP, "-g3 -O1"),
]


_compilers = OrderedDict({c.id: c for c in _all_compilers if c.available()})
_presets = [p for p in _all_presets if p.compiler.available()]

logger.info(f"Enabled {len(_compilers)} compiler(s): {', '.join(_compilers.keys())}")
logger.info(
    f"Available platform(s): {', '.join([platform.id for platform in available_platforms()])}"
)
