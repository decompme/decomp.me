from collections.abc import Callable, Iterator
from contextlib import ExitStack, contextmanager
from functools import wraps
from typing import Any
from unittest.mock import patch

from coreapp.compiler_utils import Compiler, Language, Platform

_DUMMY_PLATFORM = Platform(
    id="dummy",
    name="Dummy Platform",
    description="A dummy platform for testing",
    arch="mips",
    compilers=["dummy", "dummy-longrunning"],
    has_decompiler=True,
)
N64 = Platform(
    id="n64",
    name="Nintendo 64",
    description="MIPS (big-endian)",
    arch="mips",
    compilers=["gcc2.8.1pm", "ido5.3", "ido7.1"],
    has_decompiler=True,
)
PS1 = Platform(
    id="ps1",
    name="PlayStation",
    description="MIPS (little-endian)",
    arch="mipsel",
    compilers=[],
    has_decompiler=True,
)
PS2 = Platform(
    id="ps2",
    name="PlayStation 2",
    description="MIPS (little-endian)",
    arch="mipsee",
    compilers=["ee-gcc2.9-991111"],
    has_decompiler=True,
)
GC_WII = Platform(
    id="gc_wii",
    name="GameCube / Wii",
    description="PowerPC",
    arch="ppc",
    compilers=["mwcc_242_81"],
    has_decompiler=True,
)

DUMMY = Compiler("dummy", _DUMMY_PLATFORM, "", "", Language.C)
DUMMY_LONGRUNNING = Compiler("dummy-longrunning", _DUMMY_PLATFORM, "", "", Language.C)
GCC281PM = Compiler("gcc2.8.1pm", N64, "", "", Language.C)
IDO53 = Compiler("ido5.3", N64, "", "", Language.C)
IDO71 = Compiler("ido7.1", N64, "", "", Language.C)
EE_GCC29_991111 = Compiler("ee-gcc2.9-991111", PS2, "", "", Language.C)
MWCC_242_81 = Compiler("mwcc_242_81", GC_WII, "", "", Language.C)

_PLATFORMS = {
    platform.id: platform for platform in (_DUMMY_PLATFORM, N64, PS1, PS2, GC_WII)
}
_COMPILERS = {
    compiler.id: compiler
    for compiler in (
        DUMMY,
        DUMMY_LONGRUNNING,
        GCC281PM,
        IDO53,
        IDO71,
        EE_GCC29_991111,
        MWCC_242_81,
    )
}
_PATCH_TARGETS = (
    "coreapp.cromper_client.get_cromper_client",
    "coreapp.serializers.get_cromper_client",
    "coreapp.views.scratch.get_cromper_client",
)


@contextmanager
def patch_cromper() -> Iterator["MockCromperClient"]:
    mock_client = MockCromperClient()
    with ExitStack() as stack:
        for target in _PATCH_TARGETS:
            stack.enter_context(patch(target, return_value=mock_client))
        yield mock_client


def mock_cromper(func: Callable[..., Any]) -> Callable[..., Any]:
    """Decorator to mock cromper client in all locations where it's imported."""

    @wraps(func)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        with patch_cromper():
            return func(*args, **kwargs)

    return wrapper


class MockCromperClient:
    """Mock cromper client for testing."""

    def get_compiler_by_id(self, compiler_id: str) -> Compiler:
        try:
            return _COMPILERS[compiler_id]
        except KeyError:
            raise ValueError(f"Unknown compiler: {compiler_id}")

    def get_platform_by_id(self, platform_id: str) -> Platform:
        try:
            return _PLATFORMS[platform_id]
        except KeyError:
            raise ValueError(f"Unknown platform: {platform_id}")

    def assemble_asm(self, platform_id: str, asm: Any) -> dict[str, Any]:
        """Return mock assembly result."""
        # Create a simple mock ELF object
        if asm.data.strip() == "":
            return {
                "hash": "empty_asm_hash",
                "arch": "mips",
                "elf_object": b"",
            }
        return {
            "hash": "mock_hash_123",
            "arch": "mips",
            "elf_object": asm.data.encode(),
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
    ) -> dict[str, Any]:
        """Return mock compilation result."""
        return {"elf_object": code.encode(), "errors": ""}

    def diff(
        self,
        platform_id: str,
        target_elf: bytes,
        compiled_elf: bytes,
        diff_label: str = "",
        diff_flags: list[str] = [],
    ) -> dict[str, Any]:
        """Return mock diff result."""
        is_exact_match = b"li $v0,2" in target_elf and b"return 2" in compiled_elf
        return {
            "result": {
                "current_score": 0 if is_exact_match else 200,
                "max_score": 200,
            },
            "errors": "",
        }
