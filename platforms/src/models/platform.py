import functools
import logging

from pathlib import Path

from dataclasses import dataclass

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
    supports_objdump_disassemble: bool = False  # TODO turn into objdump flag
    has_decompiler: bool = False

    @staticmethod
    def from_dict(platform_dict):
        # nothing special required
        return Platform(**platform_dict)

    @property
    @functools.lru_cache()
    def asm_prelude(self) -> str:
        asm_prelude_path: Path = Path(__file__).parent / "asm_preludes" / f"{self.id}.s"
        if asm_prelude_path.is_file():
            return asm_prelude_path.read_text()
        logger.warning("Could not find %s", asm_prelude_path)
        return ""
