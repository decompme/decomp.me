from dataclasses import dataclass
from typing import Any


@dataclass
class DiffResult:
    result: dict[str, Any] | None = None
    errors: str | None = None


@dataclass
class CompilationResult:
    elf_object: bytes
    errors: str


@dataclass
class AssemblyResult:
    hash: str
    arch: str
    elf_object: bytes
