from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import TYPE_CHECKING

from django.conf import settings

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


@dataclass(frozen=True)
class LibraryVersions:
    name: str
    supported_versions: list[str]

    @property
    def path(self) -> Path:
        return LIBRARY_BASE_PATH / self.name


@cache
def available_libraries() -> list[LibraryVersions]:
    results = []

    for lib_dir in LIBRARY_BASE_PATH.iterdir():
        versions = []
        if not lib_dir.is_dir():
            continue
        for version_dir in lib_dir.iterdir():
            if not version_dir.is_dir():
                continue
            if not (version_dir / "include").exists():
                continue

            versions.append(version_dir.name)

        if len(versions) > 0:
            results.append(
                LibraryVersions(
                    name=lib_dir.name,
                    supported_versions=versions,
                )
            )

    return results


DIRECTX5 = Library("directx", "5.0")
DIRECTX8 = Library("directx", "8.0")
