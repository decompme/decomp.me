"""Parent-process cache for reusable target disassembly dumps."""

import hashlib
import json
import logging
from typing import Any

from .lru_cache import LRUCache

logger = logging.getLogger(__name__)


def target_dump_cache_key(
    *,
    platform_id: str,
    elf_object: bytes,
    diff_label: str,
    diff_flags: list[Any],
) -> str:
    """Return a key for a target's normalized dump inputs."""
    inputs = {
        "platform_id": platform_id,
        "elf_sha256": hashlib.sha256(elf_object).hexdigest(),
        "diff_label": diff_label,
        "diff_flags": diff_flags,
    }
    encoded = json.dumps(
        inputs, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


class TargetDumpCache:
    """Bounded LRU for successful target-object disassembly dumps."""

    def __init__(self) -> None:
        self._cache = LRUCache[str](
            size_of=lambda dump: len(dump.encode("utf-8")),
        )

    def get(self, key: str) -> str | None:
        result = self._cache.get(key)
        if result is None:
            logger.info("Target dump cache MISS key=%s", key[:12])
            return None
        logger.info("Target dump cache HIT key=%s", key[:12])
        return result

    def put(self, key: str, dump: str) -> None:
        self._cache.put(key, dump)
