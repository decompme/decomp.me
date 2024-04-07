from dataclasses import dataclass
from pathlib import Path


@dataclass
class Settings:
    DEBUG: bool

    USE_SANDBOX_JAIL: bool
    SANDBOX_CHROOT_PATH: Path
    SANDBOX_TMP_PATH: Path
    SANDBOX_NSJAIL_BIN_PATH: str
    SANDBOX_DISABLE_PROC: bool

    WINEPREFIX: Path
    COMPILER_BASE_PATH: Path
    LIBRARY_BASE_PATH: Path
    COMPILATION_TIMEOUT_SECONDS: int
    ASSEMBLY_TIMEOUT_SECONDS: int
    OBJDUMP_TIMEOUT_SECONDS: int


settings = Settings(
    DEBUG=True,
    USE_SANDBOX_JAIL=True,
    SANDBOX_CHROOT_PATH=Path("/sandbox"),
    SANDBOX_TMP_PATH=Path("/sandbox/tmp"),
    SANDBOX_NSJAIL_BIN_PATH="/bin/nsjail",
    SANDBOX_DISABLE_PROC=True,
    WINEPREFIX=Path("/tmp/wine"),
    COMPILER_BASE_PATH=Path("/backend/compilers"),
    LIBRARY_BASE_PATH=Path("/backend/libraries"),
    COMPILATION_TIMEOUT_SECONDS=30,
    ASSEMBLY_TIMEOUT_SECONDS=30,
    OBJDUMP_TIMEOUT_SECONDS=30,
)
