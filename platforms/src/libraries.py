from functools import cache

from .settings import is_supported_platform, settings

from .models.library import LibraryVersions


@cache
def available_libraries() -> list[LibraryVersions]:
    results = []

    for platform_dir in settings.LIBRARY_BASE_PATH.iterdir():
        if not platform_dir.is_dir():
            continue
        if not is_supported_platform(platform_dir.name):
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
