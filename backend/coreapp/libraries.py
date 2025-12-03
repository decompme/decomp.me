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

    def get_include_path(self, platform: str) -> Path:
        return LIBRARY_BASE_PATH / platform / self.name / self.version / "include"

    def available(self, platform: str) -> bool:
        include_path = self.get_include_path(platform)
        if not include_path.exists():
            print(f"Library {self.name} {self.version} not found at {include_path}")
        return include_path.exists()


@dataclass(frozen=True)
class LibraryVersions:
    name: str
    supported_versions: list[str]
    platform: str

    @property
    def path(self) -> Path:
        return LIBRARY_BASE_PATH / self.platform / self.name


@cache
def available_libraries() -> list[LibraryVersions]:
    results = []

    for platform_dir in LIBRARY_BASE_PATH.iterdir():
        if not platform_dir.is_dir():
            continue
        for lib_dir in platform_dir.iterdir():
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
                        platform=platform_dir.name,
                    )
                )

    return results
