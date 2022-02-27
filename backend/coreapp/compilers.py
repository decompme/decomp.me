import logging
from dataclasses import dataclass
from pathlib import Path
from typing import ClassVar, List, Optional, OrderedDict

from django.conf import settings

from coreapp import platforms

from coreapp.platforms import GBA, GC_WII, N64, NDS_ARM9, Platform, PS1, PS2, SWITCH

logger = logging.getLogger(__name__)

CONFIG_PY = "config.py"
COMPILER_BASE_PATH: Path = settings.COMPILER_BASE_PATH


@dataclass(frozen=True)
class Compiler:
    id: str
    cc: str
    platform: Platform
    base_id: Optional[str] = None
    is_gcc: bool = False
    is_ido: bool = False
    is_mwcc: bool = False
    needs_wine = False

    @property
    def path(self) -> Path:
        return COMPILER_BASE_PATH / (self.base_id or self.id)

    def available(self) -> bool:
        # consider compiler binaries present if the compiler's directory is found
        return self.path.exists()


@dataclass(frozen=True)
class DummyCompiler(Compiler):
    def available(self) -> bool:
        return settings.DUMMY_COMPILER


@dataclass(frozen=True)
class GCCCompiler(Compiler):
    is_gcc: ClassVar[bool] = True


@dataclass(frozen=True)
class IDOCompiler(Compiler):
    is_ido: ClassVar[bool] = True


@dataclass(frozen=True)
class MWCCCompiler(Compiler):
    is_mwcc: ClassVar[bool] = True


def from_id(compiler_id: str) -> Compiler:
    if compiler_id not in _compilers:
        raise ValueError(f"Unknown compiler: {compiler_id}")
    return _compilers[compiler_id]


def available_compilers() -> List[Compiler]:
    return sorted(
        _compilers.values(),
        key=lambda c: (c.platform.id, c.id),
    )


def available_platforms() -> List[Platform]:
    return sorted(
        set(compiler.platform for compiler in available_compilers()),
        key=lambda p: p.name,
    )


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

# Switch
CLANG_391 = Compiler(
    id="clang-3.9.1",
    platform=SWITCH,
    cc='TOOLROOT="$COMPILER_DIR" "$COMPILER_DIR"/bin/clang++ -target aarch64-linux-elf --sysroot="$COMPILER_DIR"/botw-lib-musl-25ed8669943bee65a650700d340e451eda2a26ba -D_LIBCPP_HAS_MUSL_LIBC -fuse-ld=lld -mcpu=cortex-a57+fp+simd+crypto+crc -mno-implicit-float -fstandalone-debug -fPIC -Wl,-Bsymbolic-functions -shared -stdlib=libc++ -nostdlib $COMPILER_FLAGS -o "$OUTPUT" "$INPUT"',
)

CLANG_401 = Compiler(
    id="clang-4.0.1",
    platform=SWITCH,
    cc='TOOLROOT="$COMPILER_DIR" "$COMPILER_DIR"/bin/clang++ -target aarch64-linux-elf --sysroot="$COMPILER_DIR"/botw-lib-musl-25ed8669943bee65a650700d340e451eda2a26ba -fuse-ld=lld -mcpu=cortex-a57+fp+simd+crypto+crc -mno-implicit-float -fstandalone-debug -fPIC -Wl,-Bsymbolic-functions -shared -stdlib=libc++ -nostdlib $COMPILER_FLAGS -o "$OUTPUT" "$INPUT"',
)

# PS1
GCC263_MIPSEL = GCCCompiler(
    id="gcc2.6.3-mipsel",
    platform=PS1,
    cc='mips-linux-gnu-cpp -Wall -lang-c -gstabs "$INPUT" | "${COMPILER_DIR}"/cc1 -mips1 -mcpu=3000 $COMPILER_FLAGS | mips-linux-gnu-as -march=r3000 -mtune=r3000 -no-pad-sections -O1 -o "$OUTPUT"',
)

PSYQ41 = GCCCompiler(
    id="psyq4.1",
    platform=PS1,
    cc='cpp -P "$INPUT" | unix2dos | ${WINE} ${COMPILER_DIR}/CC1PSX.EXE -quiet ${COMPILER_FLAGS} | ${COMPILER_DIR}/mips-elf-as -EL -march=r3000 -mtune=r3000 -G0 -o "$OUTPUT"',
)

PSYQ43 = GCCCompiler(
    id="psyq4.3",
    platform=PS1,
    cc='cpp -P "$INPUT" | unix2dos | ${WINE} ${COMPILER_DIR}/CC1PSX.EXE -quiet ${COMPILER_FLAGS} | ${COMPILER_DIR}/mips-elf-as -EL -march=r3000 -mtune=r3000 -G0 -o "$OUTPUT"',
)

PSYQ46 = GCCCompiler(
    id="psyq4.6",
    platform=PS1,
    cc='cpp -P "$INPUT" | unix2dos | ${WINE} ${COMPILER_DIR}/CC1PSX.EXE -quiet ${COMPILER_FLAGS} | ${COMPILER_DIR}/mips-elf-as -EL -march=r3000 -mtune=r3000 -G0 -o "$OUTPUT"',
)

# PS2
EE_GCC296 = GCCCompiler(
    id="ee-gcc2.96",
    platform=PS2,
    cc='"${COMPILER_DIR}"/bin/ee-gcc -c -B "${COMPILER_DIR}"/bin/ee- $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

# N64
IDO53 = IDOCompiler(
    id="ido5.3",
    platform=N64,
    cc='TOOLROOT="$COMPILER_DIR" "$COMPILER_DIR/usr/bin/cc" -c -Xcpluscomm -G0 -non_shared -Wab,-r4300_mul -woff 649,838,712 -32 $COMPILER_FLAGS -o "$OUTPUT" "$INPUT"',
)

IDO71 = IDOCompiler(
    id="ido7.1",
    platform=N64,
    cc='TOOLROOT="$COMPILER_DIR" "$COMPILER_DIR/usr/bin/cc" -c -Xcpluscomm -G0 -non_shared -Wab,-r4300_mul -woff 649,838,712 -32 $COMPILER_FLAGS -o "$OUTPUT" "$INPUT"',
)

# TODO confirm this works
GCC272KMC = GCCCompiler(
    id="gcc2.7.2kmc",
    platform=N64,
    cc='"${COMPILER_DIR}"/gcc -G0 -c -mgp32 -mfp32 ${COMPILER_FLAGS} "${INPUT}" -o "${OUTPUT}"',
)

GCC281 = GCCCompiler(
    id="gcc2.8.1",
    platform=N64,
    cc='"${COMPILER_DIR}"/gcc -G0 -c -B "${COMPILER_DIR}"/ $COMPILER_FLAGS "$INPUT" -o "$OUTPUT"',
)

# GC_WII

MWCCEPPC_CC = '${WINE} "${COMPILER_DIR}/mwcceppc.exe" -c -proc gekko -nostdinc -stderr ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"'

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

MWCC_247_108_TP = MWCCCompiler(
    id="mwcc_247_108_tp",
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
MWCCARM_CC = '${WINE} "${COMPILER_DIR}/mwccarm.exe" -c -proc arm946e -nostdinc -stderr ${COMPILER_FLAGS} -o "${OUTPUT}" "${INPUT}"'

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
    # Switch
    CLANG_391,
    CLANG_401,
    # PS1
    GCC263_MIPSEL,
    PSYQ41,
    PSYQ43,
    PSYQ46,
    # PS2
    EE_GCC296,
    # N64
    IDO53,
    IDO71,
    GCC272KMC,
    GCC281,
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
    MWCC_247_108_TP,
    MWCC_41_60831,
    MWCC_41_60126,
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
]

_compilers = OrderedDict({c.id: c for c in _all_compilers if c.available()})

logger.info(f"Enabled {len(_compilers)} compiler(s): {', '.join(_compilers.keys())}")
logger.info(
    f"Available platform(s): {', '.join([platform.id for platform in available_platforms()])}"
)
