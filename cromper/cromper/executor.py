"""Admission control for the CPU-bound tool executor."""

import logging
import threading
from collections.abc import Callable
from concurrent.futures import Executor, Future
from typing import Any

logger = logging.getLogger(__name__)


class OverloadedError(Exception):
    """Raised when the tool executor has no room for another job."""


class BoundedExecutor(Executor):
    """Limit running and queued jobs so abandoned requests cannot queue unbounded work."""

    def __init__(self, executor: Executor, capacity: int) -> None:
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self._executor = executor
        self._capacity = capacity
        # Release slots when jobs finish, even if their callers have disconnected.
        self._slots = threading.BoundedSemaphore(capacity)

    def submit(
        self, fn: Callable[..., Any], /, *args: Any, **kwargs: Any
    ) -> Future[Any]:
        if not self._slots.acquire(blocking=False):
            logger.warning(
                "Tool executor is at capacity (%d outstanding jobs), rejecting work",
                self._capacity,
            )
            raise OverloadedError(f"tool executor is at capacity ({self._capacity})")

        try:
            future = self._executor.submit(fn, *args, **kwargs)
        except BaseException:
            self._slots.release()
            raise
        future.add_done_callback(self._release)
        return future

    def _release(self, _future: Future[Any]) -> None:
        self._slots.release()

    def shutdown(self, wait: bool = True, *, cancel_futures: bool = False) -> None:
        self._executor.shutdown(wait=wait, cancel_futures=cancel_futures)
