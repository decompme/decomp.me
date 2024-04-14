import functools
import logging

from pathlib import Path

from dataclasses import dataclass, field

from .flags import Flags
from ..flags import COMMON_DIFF_FLAGS

logger = logging.getLogger(__file__)


@dataclass(frozen=True)
class Platform:
    id: str
    name: str
    description: str
    arch: str
    assemble_cmd: str
    objdump_cmd: str
    nm_cmd: str
    diff_flags: Flags = field(default_factory=lambda: COMMON_DIFF_FLAGS, hash=False)
    supports_objdump_disassemble: bool = False  # TODO turn into objdump flag
    has_decompiler: bool = False

    @property
    @functools.lru_cache()
    def asm_prelude(self) -> str:
        asm_prelude_path: Path = (
            Path(__file__).parent.parent / "asm_preludes" / f"{self.id}.s"
        )
        if asm_prelude_path.is_file():
            return asm_prelude_path.read_text()
        logger.warning("Could not find %s", asm_prelude_path)
        return ""

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "arch": self.arch,
            "diff_flags": [flag.to_json() for flag in self.diff_flags],
            "has_decompiler": self.has_decompiler,
        }
