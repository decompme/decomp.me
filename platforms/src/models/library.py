from dataclasses import dataclass
from pathlib import Path

from tornado.options import options as settings


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
