"""
Compatibility shim for platforms module.

This module provides the same interface as the old platforms module,
but fetches data from the cromper service instead of using local definitions.
"""

from typing import Any, Dict, List

from .cromper_client import get_cromper_client


class Platform:
    """Platform compatibility class."""

    def __init__(self, data: Dict[str, Any]):
        self._data = data

    @property
    def id(self) -> str:
        return self._data["id"]

    @property
    def name(self) -> str:
        return self._data.get("name", self.id)

    @property
    def arch(self) -> str:
        return self._data.get("arch", "")

    @property
    def assembler_flags(self) -> str:
        return self._data.get("assembler_flags", "")

    @property
    def description(self) -> str:
        return self._data.get("description", "")

    def available(self) -> bool:
        """Check if platform is available."""
        # All platforms from cromper are considered available
        return True

    def to_json(
        self, include_compilers: bool = False, include_presets: bool = False
    ) -> Dict[str, Any]:
        """Convert platform to JSON format for API responses."""
        result = {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "arch": self.arch,
        }

        if include_compilers:
            from . import compilers

            platform_compilers = compilers.available_compilers_for_platform(self.id)
            result["compilers"] = [
                {
                    "id": c.id,
                    "name": c.name,
                    "language": str(c.language),
                }
                for c in platform_compilers
            ]

        if include_presets:
            # TODO: Add preset support when needed
            result["presets"] = []

        return result

    def __str__(self) -> str:
        return self.id

    def __repr__(self) -> str:
        return f"Platform(id='{self.id}', arch='{self.arch}')"


def from_id(platform_id: str) -> Platform:
    """Get a platform by ID."""
    client = get_cromper_client()
    platform_data = client.get_platform_by_id(platform_id)
    return Platform(platform_data)


def available_platforms() -> List[Platform]:
    """Get all available platforms."""
    client = get_cromper_client()
    platforms_data = client.get_platforms()
    return [Platform(data) for data in platforms_data.values()]
