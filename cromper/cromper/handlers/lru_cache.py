"""Small bounded least-recently-used cache for parent-process values."""

from collections import OrderedDict
from collections.abc import Callable

_MAX_ENTRIES = 256
_MAX_BYTES = 64 * 1024 * 1024

class LRUCache[T]:
    def __init__(
        self,
        *,
        max_entries: int = _MAX_ENTRIES,
        max_bytes: int = _MAX_BYTES,
        size_of: Callable[[T], int],
    ) -> None:
        if max_entries <= 0 or max_bytes <= 0:
            raise ValueError("LRU cache limits must be positive")
        self._max_entries = max_entries
        self._max_bytes = max_bytes
        self._size_of = size_of
        self._entries: OrderedDict[str, tuple[T, int]] = OrderedDict()
        self._size_bytes = 0

    def get(self, key: str) -> T | None:
        entry = self._entries.get(key)
        if entry is None:
            return None
        self._entries.move_to_end(key)
        return entry[0]

    def put(self, key: str, value: T) -> None:
        size_bytes = self._size_of(value)
        if size_bytes < 0:
            raise ValueError("Cached value size cannot be negative")
        if size_bytes > self._max_bytes:
            return

        previous = self._entries.pop(key, None)
        if previous is not None:
            self._size_bytes -= previous[1]
        self._entries[key] = (value, size_bytes)
        self._size_bytes += size_bytes
        while (
            len(self._entries) > self._max_entries or self._size_bytes > self._max_bytes
        ):
            _, (_, evicted_size) = self._entries.popitem(last=False)
            self._size_bytes -= evicted_size
