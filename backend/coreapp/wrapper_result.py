from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class DiffResult:
    result: Optional[Dict[str, Any]] = None
    errors: Optional[str] = None


@dataclass
class CompilationResult:
    elf_object: bytes
    errors: str
