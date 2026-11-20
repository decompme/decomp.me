"""Tests for bounded tool execution and the overload response."""

import json
import threading
import time
import unittest
from concurrent.futures import ThreadPoolExecutor
from typing import Any
from unittest.mock import Mock

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from cromper.config import CromperConfig
from cromper.executor import BoundedExecutor, OverloadedError
from cromper.handlers.assemble import AssembleHandler
from cromper.handlers.compile import CompileHandler
from cromper.handlers.decompile import DecompileHandler
from cromper.handlers.diff import DiffHandler
from cromper.handlers.handlers import BaseHandler


class BoundedExecutorTests(unittest.TestCase):
    def make_executor(self, capacity: int) -> BoundedExecutor:
        inner = ThreadPoolExecutor(max_workers=1)
        self.addCleanup(inner.shutdown)
        return BoundedExecutor(inner, capacity)

    def wait_for_free_slot(self, executor: BoundedExecutor) -> None:
        """Future.result() can return before the done callback releases its slot."""
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            try:
                executor.submit(lambda: None).result(5)
                return
            except OverloadedError:
                time.sleep(0.01)
        self.fail("a slot was never released")

    def test_rejects_work_beyond_capacity(self) -> None:
        executor = self.make_executor(capacity=2)
        started = threading.Event()
        release = threading.Event()

        def blocking() -> None:
            started.set()
            release.wait(5)

        first = executor.submit(blocking)
        self.assertTrue(started.wait(5), "first job never started")
        second = executor.submit(blocking)  # queued behind the single worker

        with self.assertRaises(OverloadedError):
            executor.submit(blocking)

        release.set()
        first.result(5)
        second.result(5)

    def test_slot_is_released_when_a_job_finishes(self) -> None:
        executor = self.make_executor(capacity=1)
        self.assertEqual(executor.submit(lambda: "done").result(5), "done")
        self.wait_for_free_slot(executor)

    def test_slot_is_released_when_a_job_raises(self) -> None:
        def boom() -> None:
            raise ValueError("boom")

        executor = self.make_executor(capacity=1)
        with self.assertRaisesRegex(ValueError, "boom"):
            executor.submit(boom).result(5)
        self.wait_for_free_slot(executor)

    def test_rejects_non_positive_capacity(self) -> None:
        with self.assertRaises(ValueError):
            BoundedExecutor(Mock(), capacity=0)

    def test_shutdown_delegates(self) -> None:
        inner = Mock()
        BoundedExecutor(inner, capacity=1).shutdown(wait=False, cancel_futures=True)
        inner.shutdown.assert_called_once_with(wait=False, cancel_futures=True)


class OverloadResponseTests(AsyncHTTPTestCase):
    class UnavailableHandler(BaseHandler):
        def get(self) -> None:
            raise tornado.web.HTTPError(503, reason="service unavailable")

    class OverloadedExecutor:
        def submit(self, *args: Any, **kwargs: Any) -> Any:
            raise OverloadedError("tool executor is at capacity (4)")

    def get_app(self) -> tornado.web.Application:
        options = {"config": CromperConfig(), "executor": self.OverloadedExecutor()}
        return tornado.web.Application(
            [
                (r"/compile", CompileHandler, options),
                (r"/assemble", AssembleHandler, options),
                (r"/decompile", DecompileHandler, options),
                (r"/diff", DiffHandler, options),
                (r"/unavailable", self.UnavailableHandler, options),
            ]
        )

    def test_overload_returns_429_with_retry_after(self) -> None:
        for path in ("/compile", "/assemble", "/decompile", "/diff"):
            with self.subTest(path=path):
                response = self.fetch(
                    path,
                    method="POST",
                    body=json.dumps({}),
                    headers={"Content-Type": "application/json"},
                )

                self.assertEqual(response.code, 429)
                self.assertEqual(response.headers.get("Retry-After"), "1")
                self.assertIn("at capacity", json.loads(response.body)["error"])

    def test_unavailable_response_is_distinct_from_busy(self) -> None:
        response = self.fetch("/unavailable")
        self.assertEqual(response.code, 503)
        self.assertNotIn("Retry-After", response.headers)
        self.assertIn("service unavailable", json.loads(response.body)["error"])
