from dataclasses import dataclass
from functools import cache
from pathlib import Path

from django.conf import settings

LIBRARY_BASE_PATH: Path = settings.LIBRARY_BASE_PATH


@dataclass(frozen=True)
class Library:
    name: str
    version: str

    @property
    def path(self) -> Path:
        return LIBRARY_BASE_PATH / name / version

    def available(self) -> bool:
        return self.path.exists()

@cache
def available_libraries() -> list[Library]:
    results = []

    for lib_dir in LIBRARY_BASE_PATH.iterdir():
        if not lib_dir.is_dir():
            continue
        for version_dir in lib_dir.iterdir():
            if not version_dir.is_dir():
                continue
            if not (version_dir / "include").exists():
                continue

            results.append(Library(
                name=lib_dir.name,
                version=version_dir.name,
            ))
    return results
