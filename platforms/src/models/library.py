from dataclasses import dataclass
from pathlib import Path

from typing import TYPE_CHECKING

from ..settings import settings

if TYPE_CHECKING:
    LIBRARY_BASE_PATH: Path
else:
    LIBRARY_BASE_PATH: Path = settings.LIBRARY_BASE_PATH


@dataclass(frozen=True)
class Library:
    name: str
    version: str

    @property
    def path(self) -> Path:
        return LIBRARY_BASE_PATH / self.name / self.version

    @property
    def include_path(self) -> Path:
        return self.path / "include"

    def available(self) -> bool:
        if not self.include_path.exists():
            print(
                f"Library {self.name} {self.version} not found at {self.include_path}"
            )
        return self.include_path.exists()
