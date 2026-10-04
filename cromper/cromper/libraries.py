import logging
from dataclasses import dataclass
from pathlib import Path

from .config import CromperConfig

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Library:
    name: str
    version: str

    def get_include_path(self, platform: str, config: CromperConfig) -> Path:
        return (
            config.library_base_path / platform / self.name / self.version / "include"
        )

    def available(self, platform: str, config: CromperConfig) -> bool:
        include_path = self.get_include_path(platform, config)
        if not include_path.exists():
            logger.debug(
                f"Library {self.name} {self.version} not found at {include_path}"
            )
        return include_path.exists()


@dataclass(frozen=True)
class LibraryVersions:
    name: str
    supported_versions: list[str]
    platform: str

    def get_path(self, config: CromperConfig) -> Path:
        return config.library_base_path / self.platform / self.name


def available_libraries(config: CromperConfig) -> list[LibraryVersions]:
    """Get all available libraries across all platforms."""
    results: list[LibraryVersions] = []
    library_base_path = config.library_base_path

    if not library_base_path.exists():
        logger.warning(f"Library base path does not exist: {library_base_path}")
        return results

    for platform_dir in library_base_path.iterdir():
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


def libraries_for_platform(
    platform: str, config: CromperConfig
) -> list[LibraryVersions]:
    """Get available libraries for a specific platform."""
    return [lib for lib in available_libraries(config) if lib.platform == platform]
