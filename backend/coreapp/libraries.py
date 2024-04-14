from dataclasses import dataclass
from typing import Dict


@dataclass(frozen=True)
class Library:
    name: str
    version: str

    def to_json(self) -> Dict[str, str]:
        library = {
            "name": self.name,
            "version": self.version,
        }
        return library


@dataclass(frozen=True)
class LibraryVersions:
    name: str
    supported_versions: list[str]
    platform: str
