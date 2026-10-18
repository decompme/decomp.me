import asyncio
import json
import threading
from typing import Any, cast
from unittest.mock import patch

from asgiref.sync import sync_to_async
from asgiref.testing import ApplicationCommunicator
from django.core.asgi import get_asgi_application
from django.test import TransactionTestCase, override_settings

from coreapp.models.scratch import Asm, Assembly, Scratch
from coreapp.tests.mock_cromper_client import MockCromperClient, patch_cromper
from coreapp.views.scratch import build_export_response
from coreapp.wrapper_result import CompilationResult
from decompme.asgi import application


class ScratchConcurrencyTests(TransactionTestCase):
    """Exercise concurrent requests through the full ASGI middleware chain."""

    def setUp(self) -> None:
        super().setUp()
        self.enterContext(patch_cromper())

    async def asgi_request(self, path: str, method: str = "GET") -> tuple[int, bytes]:
        scope = {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": method,
            "scheme": "http",
            "path": path,
            "query_string": b"",
            "headers": [
                (b"host", b"testserver"),
                (b"content-type", b"application/json"),
            ],
            "server": ("testserver", 80),
        }
        communicator = cast(Any, ApplicationCommunicator)(application, scope)
        try:
            await communicator.send_input({"type": "http.request", "body": b"{}"})
            start = await communicator.receive_output(timeout=5)
            body = b""
            while True:
                message = await communicator.receive_output(timeout=5)
                body += message.get("body", b"")
                if not message.get("more_body", False):
                    break
            await communicator.wait(timeout=5)
            return start["status"], body
        finally:
            communicator.stop()

    def create_scratch_row(self) -> Scratch:
        asm = Asm.objects.create(hash="concurrency-asm", data="jr $ra\nnop\n")
        assembly = Assembly.objects.create(
            hash="concurrency-elf",
            arch="mips",
            elf_object=b"\x7fELF",
            source_asm=asm,
        )
        return Scratch.objects.create(
            slug="concscratch",
            name="concurrency",
            compiler="dummy",
            platform="dummy",
            target_assembly=assembly,
            source_code="int func(void) { return 2; }\n",
        )

    async def test_two_compiles_are_in_flight_at_once(self) -> None:
        scratch = await sync_to_async(self.create_scratch_row)()
        url = f"/api/scratch/{scratch.slug}/compile"

        in_flight = 0
        both_in_flight = asyncio.Event()

        async def blocking_compile(**kwargs: Any) -> CompilationResult:
            nonlocal in_flight
            in_flight += 1
            if in_flight >= 2:
                both_in_flight.set()
            await asyncio.wait_for(both_in_flight.wait(), timeout=5)
            return CompilationResult(b"elf", "")

        with patch.object(
            MockCromperClient, "compile_code", side_effect=blocking_compile
        ):
            responses = await asyncio.gather(
                self.asgi_request(url, "POST"),
                self.asgi_request(url, "POST"),
            )

        self.assertEqual([status for status, _ in responses], [200, 200])
        self.assertEqual(in_flight, 2)

    async def test_scratch_read_completes_while_compile_waits(self) -> None:
        scratch = await sync_to_async(self.create_scratch_row)()
        started = asyncio.Event()
        release = asyncio.Event()

        async def blocking_compile(**kwargs: Any) -> CompilationResult:
            started.set()
            await asyncio.wait_for(release.wait(), timeout=5)
            return CompilationResult(b"elf", "")

        with patch.object(
            MockCromperClient, "compile_code", side_effect=blocking_compile
        ):
            compile_task = asyncio.create_task(
                self.asgi_request(f"/api/scratch/{scratch.slug}/compile", "POST")
            )
            try:
                await asyncio.wait_for(started.wait(), timeout=5)
                status, body = await self.asgi_request(f"/api/scratch/{scratch.slug}")
                self.assertEqual(status, 200)
                self.assertEqual(json.loads(body)["slug"], scratch.slug)
                self.assertFalse(compile_task.done())
            finally:
                release.set()
                status, _ = await compile_task
            self.assertEqual(status, 200)

    @override_settings(CROMPER_REQUEST_LIMIT=1)
    async def test_overload_is_rejected_before_profile_resolution(self) -> None:
        scratch = await sync_to_async(self.create_scratch_row)()
        started = asyncio.Event()
        release = asyncio.Event()

        async def blocking_compile(**kwargs: Any) -> CompilationResult:
            started.set()
            await asyncio.wait_for(release.wait(), timeout=5)
            return CompilationResult(b"elf", "")

        with (
            patch("coreapp.tests.test_concurrency.application", get_asgi_application()),
            patch.object(
                MockCromperClient, "compile_code", side_effect=blocking_compile
            ),
        ):
            url = f"/api/scratch/{scratch.slug}/compile"
            pending = asyncio.create_task(self.asgi_request(url, "POST"))
            try:
                await asyncio.wait_for(started.wait(), timeout=5)
                with patch("coreapp.middleware.resolve_profile") as resolve_profile:
                    status, body = await self.asgi_request(url, "POST")
                    self.assertEqual(status, 429)
                    self.assertEqual(json.loads(body)["code"], "TooManyRequests")
                    resolve_profile.assert_not_called()

                status, _ = await self.asgi_request(f"/api/scratch/{scratch.slug}")
                self.assertEqual(status, 200)
                self.assertFalse(pending.done())
            finally:
                release.set()
                status, _ = await pending
            self.assertEqual(status, 200)

    async def test_scratch_read_completes_while_export_is_compressed(self) -> None:
        scratch = await sync_to_async(self.create_scratch_row)()
        loop = asyncio.get_running_loop()
        started = asyncio.Event()
        release = threading.Event()

        def blocking_export(*args: Any, **kwargs: Any) -> Any:
            loop.call_soon_threadsafe(started.set)
            if not release.wait(timeout=5):
                raise AssertionError("export blocked the event loop")
            return build_export_response(*args, **kwargs)

        with patch(
            "coreapp.views.scratch.build_export_response", side_effect=blocking_export
        ):
            export_task = asyncio.create_task(
                self.asgi_request(f"/api/scratch/{scratch.slug}/export")
            )
            try:
                await asyncio.wait_for(started.wait(), timeout=5)
                status, _ = await self.asgi_request(f"/api/scratch/{scratch.slug}")
                self.assertEqual(status, 200)
                self.assertFalse(export_task.done())
            finally:
                release.set()
                status, _ = await export_task
            self.assertEqual(status, 200)
