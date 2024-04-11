import logging
from dataclasses import dataclass, field
from typing import Any, Dict, OrderedDict
from pathlib import Path
import functools

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
    arch: str  # used by asm-differ
    # assemble_cmd: str
    # objdump_cmd: str
    # nm_cmd: str
    diff_flags: Flags = field(default_factory=lambda: COMMON_DIFF_FLAGS, hash=False)
    # supports_objdump_disassemble: bool = False  # TODO turn into objdump flag
    has_decompiler: bool = False

    # @property
    # @functools.lru_cache()
    # def asm_prelude(self) -> str:
    #     asm_prelude_path: Path = Path(__file__).parent / "asm_preludes" / f"{self.id}.s"
    #     if asm_prelude_path.is_file():
    #         return asm_prelude_path.read_text()
    #     return ""

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
)

MSDOS = Platform(
    id="msdos",
    name="Microsoft DOS",
    description="x86",
    arch="i686",
)

WIN32 = Platform(
    id="win32",
    name="Windows (9x/NT)",
    description="x86 (32bit)",
    arch="i686",
)

SWITCH = Platform(
    id="switch",
    name="Nintendo Switch",
    description="ARMv8-A",
    arch="aarch64",
)

N64 = Platform(
    id="n64",
    name="Nintendo 64",
    description="MIPS (big-endian)",
    arch="mips",
    diff_flags=COMMON_DIFF_FLAGS + COMMON_MIPS_DIFF_FLAGS,
    has_decompiler=True,
)

IRIX = Platform(
    id="irix",
    name="IRIX",
    description="MIPS (big-endian, PIC)",
    arch="mips",
    diff_flags=COMMON_DIFF_FLAGS + COMMON_MIPS_DIFF_FLAGS,
    has_decompiler=True,
)

PS1 = Platform(
    id="ps1",
    name="PlayStation",
    description="MIPS (little-endian)",
    arch="mipsel",
    diff_flags=COMMON_DIFF_FLAGS + COMMON_MIPS_DIFF_FLAGS,
    has_decompiler=True,
)

PSP = Platform(
    id="psp",
    name="PlayStation Portable",
    description="MIPS (little-endian)",
    arch="mipsel:4000",
    diff_flags=COMMON_DIFF_FLAGS + COMMON_MIPS_DIFF_FLAGS,
    has_decompiler=True,
)

SATURN = Platform(
    id="saturn",
    name="Saturn",
    description="SH2 (big-endian)",
    arch="sh2",
    diff_flags=COMMON_DIFF_FLAGS,
)

PS2 = Platform(
    id="ps2",
    name="PlayStation 2",
    description="MIPS (little-endian)",
    arch="mipsee",
    diff_flags=COMMON_DIFF_FLAGS + COMMON_MIPS_DIFF_FLAGS,
    has_decompiler=True,
)

MACOSX = Platform(
    id="macosx",
    name="Mac OS X",
    description="PowerPC",
    arch="ppc",
)

GC_WII = Platform(
    id="gc_wii",
    name="GameCube / Wii",
    description="PowerPC",
    arch="ppc",
    has_decompiler=True,
)

NDS_ARM9 = Platform(
    id="nds_arm9",
    name="Nintendo DS",
    description="ARMv5TE",
    arch="arm32",
)

GBA = Platform(
    id="gba",
    name="Game Boy Advance",
    description="ARMv4T",
    arch="arm32",
)

N3DS = Platform(
    id="n3ds",
    name="Nintendo 3DS",
    description="ARMv6K",
    arch="arm32",
)

# TODO: _platforms should be populated dynamically based on what platforms are available
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
