import logging
import copy

from dataclasses import dataclass
from typing import Optional

from pathlib import Path

from ..settings import settings
from .platform import Platform

logger = logging.getLogger(__file__)


# @dataclass(frozen=True)
# class BackendCompiler:
#     id: str
#     cc: str
#     platform: Platform
#     flags: ClassVar[list]
#     library_include_flag: str
#     base_compiler: Optional["Compiler"] = None
#     is_gcc: ClassVar[bool] = False
#     is_ido: ClassVar[bool] = False
#     is_mwcc: ClassVar[bool] = False
#     language: str = "c"  # FIXME


@dataclass(frozen=True)
class Compiler:
    id: str
    cc: str
    platform: Platform

    # We don't care about supported compiler flags when compiling

    library_include_flag: str

    file_ext: str  # TODO: this should really be language...

    base_compiler: Optional["Compiler"] = None
    is_gcc: Optional[bool] = False
    is_ido: Optional[bool] = False
    is_mwcc: Optional[bool] = False

    @staticmethod
    def from_dict(compiler_dict: dict):
        compiler = copy.deepcopy(compiler_dict)
        compiler["platform"] = Platform.from_dict(compiler["platform"])
        if compiler["base_compiler"]:
            compiler["base_compiler"] = Compiler.from_dict(compiler["base_compiler"])

        return Compiler(**compiler)

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
