"""Parent-process cache for successful compilation results."""

import hashlib
import json
import logging
from dataclasses import replace
from typing import Any

from .lru_cache import LRUCache
from .metrics import OperationResult

logger = logging.getLogger(__name__)


def compilation_cache_key(data: dict[str, Any]) -> str:
    """Return a stable key for the inputs that reach CompilerWrapper.compile_code."""
    code = data.get("code", "").replace("\r\n", "\n")
    context = data.get("context", "").replace("\r\n", "\n")
    cache_inputs = {
        "compiler_id": data.get("compiler_id"),
        "compiler_flags": data.get("compiler_flags", ""),
        "code": code,
        "context": context,
        "function": data.get("function", ""),
        "libraries": data.get("libraries", []),
    }
    encoded = json.dumps(
        cache_inputs, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


class CompilationCache:
    """Bounded LRU cache; intended to be accessed only in Cromper's parent process."""

    def __init__(self) -> None:
        self._cache = LRUCache[OperationResult](
            size_of=self._result_size_bytes,
        )

    @staticmethod
    def _result_size_bytes(result: OperationResult) -> int:
        return len(result.response.get("elf_object", "")) + len(
            result.response.get("errors", "").encode("utf-8")
        )

    def get(self, key: str) -> OperationResult | None:
        result = self._cache.get(key)
        if result is None:
            logger.info("Compilation cache MISS key=%s", key[:12])
            return None
        logger.info("Compilation cache HIT key=%s", key[:12])
        return replace(result, duration_ms=0)

    def put(self, key: str, result: OperationResult) -> None:
        if not result.response.get("success"):
            return

        self._cache.put(key, result)
