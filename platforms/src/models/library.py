from dataclasses import dataclass
from pathlib import Path

from ..settings import settings


@dataclass(frozen=True)
class Library:
    name: str
    version: str

    def get_include_path(self, platform: str) -> Path:
        return settings.LIBRARY_BASE_PATH / platform / self.name / self.version

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
        return settings.LIBRARY_BASE_PATH / self.platform / self.name

    def to_json(self):
        return {
            "name": self.name,
            "supported_versions": self.supported_versions,
            "platform": self.platform,
        }
