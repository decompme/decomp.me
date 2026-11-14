import asyncio
import json
from typing import Any
from unittest.mock import AsyncMock

from django.core.exceptions import ImproperlyConfigured
from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase, override_settings

from coreapp.admission import limit_cromper_requests, may_wait_for_cromper


@override_settings(CROMPER_REQUEST_LIMIT=1)
class CromperAdmissionTests(SimpleTestCase):
    def setUp(self) -> None:
        self.factory = RequestFactory()

    def test_routes_that_can_wait_for_cromper_are_limited(self) -> None:
        for method, path in (
            ("POST", "/api/scratch"),
            ("POST", "/api/scratch.json"),
            ("PUT", "/api/scratch/abc"),
            ("PATCH", "/api/scratch/abc"),
            ("GET", "/api/scratch/abc/compile"),
            ("HEAD", "/api/scratch/abc/compile"),
            ("POST", "/api/scratch/abc/compile"),
            ("POST", "/api/scratch/abc/compile.json"),
            ("POST", "/api/scratch/abc/decompile"),
            ("POST", "/api/scratch/abc/fork"),
            ("GET", "/api/scratch/abc/export"),
            ("HEAD", "/api/scratch/abc/export"),
            ("GET", "/api/scratch/abc/export?target_only=1"),
        ):
            with self.subTest(method=method, path=path):
                self.assertTrue(
                    may_wait_for_cromper(self.factory.generic(method, path))
                )

    def test_other_routes_and_methods_bypass_the_limit(self) -> None:
        for method, path in (
            ("GET", "/api/scratch"),
            ("GET", "/api/scratch/abc"),
            ("DELETE", "/api/scratch/abc"),
            ("OPTIONS", "/api/scratch/abc/compile"),
            ("POST", "/api/scratch/abc/claim"),
            ("GET", "/api/scratch/abc/family"),
            ("GET", "/api/preset"),
            ("GET", "/api/healthz"),
            ("GET", "/admin/"),
            ("POST", "/api/missing"),
        ):
            with self.subTest(method=method, path=path):
                self.assertFalse(
                    may_wait_for_cromper(self.factory.generic(method, path))
                )

    async def test_full_gate_rejects_without_entering_django_and_allows_reads(
        self,
    ) -> None:
        started = asyncio.Event()
        release = asyncio.Event()

        async def get_response(request: Any) -> HttpResponse:
            if request.method == "POST":
                started.set()
                await release.wait()
            return HttpResponse()

        inner = AsyncMock(side_effect=get_response)
        gate = limit_cromper_requests(inner)
        request = self.factory.post("/api/scratch")
        pending = asyncio.ensure_future(gate(request))
        try:
            await asyncio.wait_for(started.wait(), timeout=5)
            rejected = await gate(request)
            self.assertEqual(rejected.status_code, 429)
            self.assertEqual(rejected["Retry-After"], "1")
            self.assertEqual(rejected["Cache-Control"], "no-store")
            self.assertEqual(json.loads(rejected.content)["code"], "TooManyRequests")
            inner.assert_awaited_once()

            read = await gate(self.factory.get("/api/scratch/abc"))
            self.assertEqual(read.status_code, 200)
            self.assertFalse(pending.done())
        finally:
            release.set()
            await pending

        self.assertEqual((await gate(request)).status_code, 200)

    async def test_exception_releases_slot(self) -> None:
        inner = AsyncMock(side_effect=[RuntimeError("failed"), HttpResponse()])
        gate = limit_cromper_requests(inner)
        request = self.factory.post("/api/scratch")
        with self.assertRaisesMessage(RuntimeError, "failed"):
            await gate(request)
        self.assertEqual((await gate(request)).status_code, 200)

    async def test_cancellation_releases_slot(self) -> None:
        started = asyncio.Event()

        async def get_response(request: Any) -> HttpResponse:
            started.set()
            await asyncio.Event().wait()
            return HttpResponse()

        inner = AsyncMock(side_effect=get_response)
        gate = limit_cromper_requests(inner)
        request = self.factory.post("/api/scratch")
        pending = asyncio.ensure_future(gate(request))
        try:
            await asyncio.wait_for(started.wait(), timeout=5)
        finally:
            pending.cancel()
            with self.assertRaises(asyncio.CancelledError):
                await pending

        inner.side_effect = None
        inner.return_value = HttpResponse()
        self.assertEqual((await gate(request)).status_code, 200)

    @override_settings(CROMPER_REQUEST_LIMIT=2)
    async def test_configured_capacity_is_used(self) -> None:
        started = asyncio.Event()
        release = asyncio.Event()
        count = 0

        async def get_response(request: Any) -> HttpResponse:
            nonlocal count
            count += 1
            if count == 2:
                started.set()
            await release.wait()
            return HttpResponse()

        gate = limit_cromper_requests(get_response)
        request = self.factory.post("/api/scratch")
        pending = [asyncio.ensure_future(gate(request)) for _ in range(2)]
        try:
            await asyncio.wait_for(started.wait(), timeout=5)
            self.assertEqual((await gate(request)).status_code, 429)
        finally:
            release.set()
            responses = await asyncio.gather(*pending)
        self.assertEqual([response.status_code for response in responses], [200, 200])

    @override_settings(CROMPER_REQUEST_LIMIT=0)
    def test_nonpositive_limit_is_rejected(self) -> None:
        with self.assertRaisesMessage(ImproperlyConfigured, "CROMPER_REQUEST_LIMIT"):
            limit_cromper_requests(AsyncMock())
