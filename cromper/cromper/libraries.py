import logging
from dataclasses import dataclass
from functools import cache
from pathlib import Path
from typing import List

logger = logging.getLogger(__name__)

# Global library base path - will be set by main.py config
LIBRARY_BASE_PATH: Path = Path("/opt/libraries")


def set_library_base_path(path: Path) -> None:
    """Set the library base path."""
    global LIBRARY_BASE_PATH
    LIBRARY_BASE_PATH = path
    logger.info(f"Library base path set to: {LIBRARY_BASE_PATH}")


@dataclass(frozen=True)
class Library:
    name: str
    version: str

    def get_include_path(self, platform: str) -> Path:
        return LIBRARY_BASE_PATH / platform / self.name / self.version / "include"

    def available(self, platform: str) -> bool:
        include_path = self.get_include_path(platform)
        if not include_path.exists():
            logger.debug(
                f"Library {self.name} {self.version} not found at {include_path}"
            )
        return include_path.exists()


@dataclass(frozen=True)
class LibraryVersions:
    name: str
    supported_versions: List[str]
    platform: str

    @property
    def path(self) -> Path:
        return LIBRARY_BASE_PATH / self.platform / self.name


@cache
def available_libraries() -> List[LibraryVersions]:
    """Get all available libraries across all platforms."""
    results = []

    if not LIBRARY_BASE_PATH.exists():
        logger.warning(f"Library base path does not exist: {LIBRARY_BASE_PATH}")
        return results

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
                        supported_versions=sorted(
                            versions
                        ),  # Sort versions for consistency
                        platform=platform_dir.name,
                    )
                )

    logger.info(f"Found {len(results)} library collections")
    return results


def libraries_for_platform(platform: str) -> List[LibraryVersions]:
    """Get available libraries for a specific platform."""
    return [lib for lib in available_libraries() if lib.platform == platform]
