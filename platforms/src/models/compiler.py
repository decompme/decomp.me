import logging

from dataclasses import dataclass
from typing import Optional, ClassVar
from pathlib import Path

from tornado.options import options as settings

from .platform import Platform
from .flags import Flags, Language

logger = logging.getLogger(__file__)


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
                settings.COMPILER_BASE_PATH
                / self.base_compiler.platform.id
                / self.base_compiler.id
            )
        return settings.COMPILER_BASE_PATH / self.platform.id / self.id

    def available(self) -> bool:
        # consider compiler binaries present if the compiler's directory is found
        if not self.path.exists():
            logger.warning(f"Compiler {self.id} not found at {self.path}")
        return self.path.exists()

    def to_json(self):
        compiler_json = {
            "id": self.id,
            "platform": self.platform.id,
            "flags": [flag.to_json() for flag in self.flags],
            "language": self.language.value,
            "is_gcc": self.is_gcc,
            "is_ido": self.is_ido,
            "is_mwcc": self.is_mwcc,
        }

        return compiler_json
