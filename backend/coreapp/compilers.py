"""
Compatibility shim for compilers module.

This module provides the same interface as the old compilers module,
but fetches data from the cromper service instead of using local definitions.
"""

from typing import Any, Dict, List

from .cromper_client import get_cromper_client


class Compiler:
    """Compiler compatibility class."""

    def __init__(self, data: Dict[str, Any]):
        self._data = data

    @property
    def id(self) -> str:
        return self._data["id"]

    @property
    def platform(self) -> Any:
        # Return platform data as-is for compatibility
        return self._data.get("platform", {})

    @property
    def language(self) -> Any:
        # Return language as string or object for compatibility
        return self._data.get("language", "C")

    @property
    def name(self) -> str:
        return self._data.get("name", self.id)

    @property
    def cc(self) -> str:
        return self._data.get("cc", "")

    @property
    def library_include_flag(self) -> str:
        return self._data.get("library_include_flag", "-I")

    def available(self) -> bool:
        """Check if compiler is available."""
        # All compilers from cromper are considered available
        return True

    def __str__(self) -> str:
        return self.id

    def __repr__(self) -> str:
        return f"Compiler(id='{self.id}', platform='{self.platform}')"


def from_id(compiler_id: str) -> Compiler:
    """Get a compiler by ID."""
    client = get_cromper_client()
    compiler_data = client.get_compiler_by_id(compiler_id)
    return Compiler(compiler_data)


def available_compilers() -> List[Compiler]:
    """Get all available compilers."""
    client = get_cromper_client()
    compilers_data = client.get_compilers()
    return [Compiler(data) for data in compilers_data.values()]


def available_compilers_for_platform(platform_id: str) -> List[Compiler]:
    """Get available compilers for a specific platform."""
    client = get_cromper_client()
    compilers_data = client.get_compilers()
    return [
        Compiler(data)
        for data in compilers_data.values()
        if data.get("platform") == platform_id
    ]
