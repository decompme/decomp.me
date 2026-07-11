from functools import wraps
from typing import Any
from unittest.mock import patch

from coreapp.compiler_utils import Compiler, Language, Platform


class MockCromperClient:
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
            flags=[],
            diff_flags=[],
            language=Language.C,
        )

    def get_compilers(self) -> dict[str, Compiler]:
        return {self.dummy_compiler.id: self.dummy_compiler}

    def get_platforms(self) -> dict[str, Platform]:
        return {self.dummy_platform.id: self.dummy_platform}

    def get_libraries(self, platform: str = "") -> list[dict[str, Any]]:
        if platform and platform != self.dummy_platform.id:
            return []
        return [{"name": "directx", "supported_versions": ["8.0"], "platform": "dummy"}]

    def get_compiler_by_id(self, compiler_id: str) -> Compiler:
        if compiler_id != self.dummy_compiler.id:
            raise ValueError(f"Unknown compiler: {compiler_id}")
        return self.dummy_compiler

    def get_platform_by_id(self, platform_id: str) -> Platform:
        if platform_id != self.dummy_platform.id:
            raise ValueError(f"Unknown platform: {platform_id}")
        return self.dummy_platform

    def assemble_asm(self, platform_id: str, asm: Any) -> dict[str, Any]:
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
        return "int func(void) {\n    return 0;\n}\n"

    def compile_code(
        self,
        compiler_id: str,
        compiler_flags: str,
        code: str,
        context: str,
        function: str = "",
        libraries: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        mock_elf = b"\x7fELF" + b"\x00" * 100
        return {"elf_object": mock_elf, "errors": ""}

    def diff(
        self,
        platform_id: str,
        target_elf: bytes,
        compiled_elf: bytes,
        diff_label: str = "",
        diff_flags: list[str] | None = None,
    ) -> dict[str, Any]:
        return {
            "result": {"current_score": 0, "max_score": 100},
            "errors": "",
        }


def mock_cromper(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        mock_client = MockCromperClient()
        with (
            patch("coreapp.cromper_client.get_cromper_client", return_value=mock_client),
            patch("coreapp.serializers.get_cromper_client", return_value=mock_client),
            patch("coreapp.views.scratch.get_cromper_client", return_value=mock_client),
            patch("coreapp.views.compiler.get_cromper_client", return_value=mock_client),
            patch("coreapp.views.library.get_cromper_client", return_value=mock_client),
            patch("coreapp.views.platform.get_cromper_client", return_value=mock_client),
        ):
            return func(*args, **kwargs)

    return wrapper
