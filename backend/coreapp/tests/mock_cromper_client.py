from functools import wraps
from typing import Any, Dict
from unittest.mock import patch
from coreapp.cromper_client import Compiler, Language, Platform


def mock_cromper(func):
    """Decorator to mock cromper client in all locations where it's imported."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        mock_client = MockCromperClient()
        # Patch all locations where get_cromper_client is imported
        with patch("coreapp.cromper_client.get_cromper_client", return_value=mock_client), \
             patch("coreapp.serializers.get_cromper_client", return_value=mock_client), \
             patch("coreapp.views.scratch.get_cromper_client", return_value=mock_client):
            return func(*args, **kwargs)
    return wrapper


class MockCromperClient:
    """Mock cromper client for testing."""

    def __init__(self) -> None:
        self.dummy_platform = Platform(
            id="dummy",
            name="Dummy Platform",
            description="A dummy platform for testing",
            arch="mips",
            compilers=["dummy"],
            has_decompiler=True,
        )
        self.dummy_compiler = Compiler(
            id="dummy",
            platform=self.dummy_platform,
            flags="",
            diff_flags="",
            language=Language.C,
        )

    def get_compiler_by_id(self, compiler_id: str) -> Compiler:
        """Return a mock compiler."""
        return self.dummy_compiler

    def get_platform_by_id(self, platform_id: str) -> Platform:
        """Return a mock platform."""
        return self.dummy_platform

    def assemble_asm(self, platform_id: str, asm: Any) -> Dict[str, Any]:
        """Return mock assembly result."""
        # Create a simple mock ELF object
        if asm.data.strip() == "":
            return {
                "hash": "empty_asm_hash",
                "arch": "mips",
                "elf_object": b"",
            }
        mock_elf = b"\x7fELF" + b"\x00" * 100
        return {
            "hash": "mock_hash_123",
            "arch": "mips",
            "elf_object": mock_elf,
        }

    def decompile(
        self,
        platform_id: str,
        compiler_id: str,
        asm: str,
        default_source_code: str = "",
        context: str = "",
    ) -> str:
        """Return mock decompiled code."""
        return "int func(void) {\n    return 0;\n}\n"

    def compile_code(
        self,
        compiler_id: str,
        compiler_flags: str,
        code: str,
        context: str,
        function: str = "",
        libraries: list[dict[str, str]] = [],
    ) -> Dict[str, Any]:
        """Return mock compilation result."""
        mock_elf = b"\x7fELF" + b"\x00" * 100
        return {"elf_object": mock_elf, "errors": ""}

    def diff(
        self,
        platform_id: str,
        target_elf: bytes,
        compiled_elf: bytes,
        diff_label: str = "",
        diff_flags: list[str] = [],
    ) -> Dict[str, Any]:
        """Return mock diff result."""
        return {
            "result": {"current_score": 0, "max_score": 100},
            "errors": "",
        }
