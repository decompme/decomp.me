import asyncio
import base64
import json
from collections.abc import AsyncIterator, Callable
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from threading import Event
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import Mock, patch

import httpx
import requests
from django.test import SimpleTestCase

from coreapp.cromper_client import (
    _ASYNC_LIMITS,
    CromperBusyError,
    CromperClient,
    CromperError,
    CromperTimeoutError,
    CromperUnavailableError,
)
from coreapp.error import AssemblyError
from coreapp.wrapper_result import AssemblyResult, CompilationResult, DiffResult


class CromperClientCompilerTests(SimpleTestCase):
    def setUp(self) -> None:
        self.enterContext(patch.object(CromperClient, "_check_version"))

    def test_libraries_are_cached_separately_per_platform(self) -> None:
        client = CromperClient("http://cromper")
        with patch.object(
            client,
            "_make_request",
            side_effect=[
                {"libraries": [{"name": "all"}]},
                {"libraries": []},
                {"libraries": [{"name": "ps1"}]},
            ],
        ) as request:
            for platform in ("", "n64", "ps1"):
                first = client.get_libraries(platform)
                self.assertIs(client.get_libraries(platform), first)
            self.assertEqual(request.call_count, 3)
            self.assertEqual(
                [call.kwargs["params"] for call in request.call_args_list],
                [{}, {"platform": "n64"}, {"platform": "ps1"}],
            )

    def test_invalid_libraries_are_not_cached(self) -> None:
        client = CromperClient("http://cromper")
        with patch.object(
            client,
            "_make_request",
            side_effect=[
                {"libraries": ["invalid"]},
                {"libraries": []},
            ],
        ) as request:
            with self.assertRaises(CromperError):
                client.get_libraries()
            self.assertEqual(client.get_libraries(), [])
            self.assertEqual(request.call_count, 2)

    def test_recovery_during_metadata_return_keeps_a_valid_snapshot(self) -> None:
        cases: list[tuple[str, dict[str, Any]]] = [
            ("get_compilers", {"compilers": {}}),
            ("get_platforms", {}),
        ]
        for getter, payload in cases:
            with self.subTest(getter=getter), ThreadPoolExecutor(max_workers=1) as pool:
                client = CromperClient("http://cromper")

                def recover_after_publication(
                    message: str,
                    client: CromperClient = client,
                    pool: ThreadPoolExecutor = pool,
                ) -> None:
                    if message.startswith(("Fetched", "Cached")):
                        client._had_transport_failure = True
                        pool.submit(client._handle_successful_communication).result(5)

                with (
                    patch.object(client, "_make_request", return_value=payload),
                    patch(
                        "coreapp.cromper_client.logger.info",
                        side_effect=recover_after_publication,
                    ),
                ):
                    self.assertEqual(getattr(client, getter)(), {})
                self.assertIsNone(client._compilers_cache)
                self.assertIsNone(client._platforms_cache)

    def test_invalidation_during_fetch_does_not_repopulate_stale_metadata(self) -> None:
        for getter, payload, expected in (
            ("get_compilers", {"compilers": {}}, {}),
            ("get_platforms", {}, {}),
            ("get_libraries", {"libraries": []}, []),
        ):
            with self.subTest(getter=getter), ThreadPoolExecutor(max_workers=1) as pool:
                client = CromperClient("http://cromper")
                started = Event()
                release = Event()

                def blocked_request(
                    *args: Any,
                    started: Event = started,
                    release: Event = release,
                    payload: dict[str, Any] = payload,
                    **kwargs: Any,
                ) -> Any:
                    started.set()
                    if not release.wait(5):
                        raise AssertionError("metadata request was not released")
                    return payload

                with patch.object(client, "_make_request", side_effect=blocked_request):
                    pending = pool.submit(getattr(client, getter))
                    try:
                        self.assertTrue(started.wait(5))
                        client._had_transport_failure = True
                        client._handle_successful_communication()
                    finally:
                        release.set()
                    self.assertEqual(pending.result(5), expected)

                self.assertIsNone(client._compilers_cache)
                self.assertIsNone(client._platforms_cache)
                self.assertEqual(client._libraries_cache, {})
                with patch.object(
                    client, "_make_request", return_value=payload
                ) as fetch:
                    self.assertEqual(getattr(client, getter)(), expected)
                    self.assertEqual(getattr(client, getter)(), expected)
                    fetch.assert_called_once()

    language_response = {
        "default": {"id": "c", "display_name": "C", "extension": "c"},
        "overrides": [
            {
                "flag": "-x c++",
                "id": "cxx",
                "display_name": "C++",
                "extension": "cpp",
            }
        ],
    }
    platform_response = {
        "n64": {
            "id": "n64",
            "name": "Nintendo 64",
            "description": "MIPS (big-endian)",
            "arch": "mips",
            "compilers": ["ido7.1"],
            "has_decompiler": True,
        }
    }

    @staticmethod
    def make_response(payload: object, status_code: int = 200, text: str = "") -> Mock:
        response = Mock(spec=requests.Response)
        response.status_code = status_code
        response.text = text
        response.json.return_value = payload
        return response

    def test_deserializes_compiler_metadata_response(self) -> None:
        compiler_response = {
            "compilers": {
                "ido7.1": {
                    "id": "ido7.1",
                    "platform": "n64",
                    "flags_class": "ido",
                    "diff_flags_class": "mips",
                    "language": self.language_response,
                }
            },
            "flags": {"ido": {"flags": []}},
            "diff_flags": {
                "common": {"flags": []},
                "mips": {"parent": "common", "flags": []},
            },
        }
        client = CromperClient("http://cromper")

        with patch.object(
            client,
            "_make_request",
            side_effect=[compiler_response, self.platform_response],
        ):
            compiler = client.get_compiler_by_id("ido7.1")

        self.assertEqual(compiler.id, "ido7.1")
        self.assertEqual(compiler.platform.id, "n64")
        self.assertEqual(compiler.flag_class, "ido")
        self.assertEqual(compiler.diff_flag_class, "mips")
        self.assertEqual(compiler.resolve_language("-O2").extension, "c")
        self.assertEqual(compiler.resolve_language("-O2 -x c++").extension, "cpp")

    def test_failed_metadata_read_does_not_cache_partial_results(self) -> None:
        client = CromperClient("http://cromper")
        valid = {
            "id": "ido7.1",
            "platform": "n64",
            "flags_class": "ido",
            "diff_flags_class": "mips",
            "language": self.language_response,
        }
        with (
            patch.object(client, "get_platform_by_id", return_value=object()),
            patch.object(
                client,
                "_make_request",
                side_effect=[
                    {"compilers": {"ido7.1": valid, "broken": {"platform": "n64"}}},
                    {"compilers": {"ido7.1": valid}},
                ],
            ) as request,
        ):
            with self.assertRaises(CromperError):
                client.get_compilers()
            self.assertIsNone(client._compilers_cache)
            self.assertEqual(client.get_compiler_by_id("ido7.1").id, "ido7.1")
            self.assertEqual(request.call_count, 2)

    def test_connection_failure_is_unavailable_and_preserves_cause(self) -> None:
        client = CromperClient("http://cromper")
        connection_error = requests.exceptions.ConnectionError("connection refused")

        with (
            patch.object(
                client.session,
                "request",
                side_effect=connection_error,
            ),
            self.assertRaises(CromperUnavailableError) as raised,
        ):
            client._make_request("GET", "/compiler")

        self.assertIs(raised.exception.__cause__, connection_error)
        self.assertTrue(client._had_transport_failure)

    def test_timeout_is_distinct_and_preserves_cause(self) -> None:
        client = CromperClient("http://cromper")
        timeout = requests.exceptions.Timeout("timed out")

        with (
            patch.object(client.session, "request", side_effect=timeout),
            self.assertRaises(CromperTimeoutError) as raised,
        ):
            client._make_request("GET", "/compiler")

        self.assertNotIsInstance(raised.exception, CromperUnavailableError)
        self.assertIs(raised.exception.__cause__, timeout)
        self.assertTrue(client._had_transport_failure)

    def test_http_error_does_not_mark_service_unavailable(self) -> None:
        client = CromperClient("http://cromper")
        response = self.make_response({"error": "invalid compiler_id"}, status_code=400)

        with (
            patch.object(client.session, "request", return_value=response),
            self.assertRaisesMessage(
                CromperError,
                "cromper /compile returned HTTP 400: invalid compiler_id",
            ),
        ):
            client._make_request("POST", "/compile")

        self.assertFalse(client._had_transport_failure)

    def test_blocking_request_reports_busy_without_retrying(self) -> None:
        client = CromperClient("http://cromper")
        response = self.make_response({"error": "at capacity"}, status_code=429)
        with (
            patch.object(client.session, "request", return_value=response) as request,
            self.assertRaises(CromperBusyError) as raised,
        ):
            client._make_request("GET", "/compiler")
        request.assert_called_once()
        self.assertEqual(raised.exception.status_code, 429)
        self.assertFalse(client._had_transport_failure)

    def test_malformed_json_is_protocol_error(self) -> None:
        client = CromperClient("http://cromper")
        response = self.make_response({})
        decode_error = ValueError("bad json")
        response.json.side_effect = decode_error

        with (
            patch.object(client.session, "request", return_value=response),
            self.assertRaises(CromperError) as raised,
        ):
            client._make_request("GET", "/compiler")

        self.assertNotIsInstance(raised.exception, CromperUnavailableError)
        self.assertIs(raised.exception.__cause__, decode_error)
        self.assertFalse(client._had_transport_failure)

    def test_next_response_after_transport_failure_invalidates_caches(self) -> None:
        client = CromperClient("http://cromper")
        client._compilers_cache = {"stale": Mock()}
        client._platforms_cache = {"stale": Mock()}
        client._libraries_cache = {"n64": [{"name": "stale"}]}
        recovered_response = self.make_response({"libraries": []})

        with patch.object(
            client.session,
            "request",
            side_effect=[
                requests.exceptions.ConnectionError("connection refused"),
                recovered_response,
            ],
        ) as request:
            with self.assertRaises(CromperUnavailableError):
                client.get_libraries()
            self.assertEqual(client.get_libraries(), [])

        self.assertIsNone(client._compilers_cache)
        self.assertIsNone(client._platforms_cache)
        self.assertNotIn("n64", client._libraries_cache)
        self.assertFalse(client._had_transport_failure)
        self.assertEqual(
            [call.args[1] for call in request.call_args_list],
            [
                "http://cromper/library",
                "http://cromper/library",
            ],
        )

    def test_platform_metadata_id_must_match_dictionary_key(self) -> None:
        client = CromperClient("http://cromper")
        response = {"n64": {**self.platform_response["n64"], "id": "not-n64"}}

        with (
            patch.object(client, "_make_request", return_value=response),
            self.assertRaisesMessage(
                CromperError, "Platform ID 'not-n64' does not match key 'n64'"
            ),
        ):
            client.get_platforms()

        self.assertIsNone(client._platforms_cache)

    def test_unknown_platform_raises_value_error_without_key_error_cause(self) -> None:
        client = CromperClient("http://cromper")

        with (
            patch.object(client, "get_platforms", return_value={}),
            self.assertRaises(ValueError) as raised,
        ):
            client.get_platform_by_id("missing")

        self.assertTrue(raised.exception.__suppress_context__)


class CromperVersionTests(SimpleTestCase):
    def test_library_requests_detect_version_changes_and_refresh(self) -> None:
        client = CromperClient("http://cromper")
        with (
            patch("coreapp.cromper_client.time.monotonic", return_value=0) as clock,
            patch.object(
                client,
                "_make_request",
                side_effect=[
                    {"version": "version-a"},
                    {"libraries": [{"name": "old"}]},
                    {"version": "version-b"},
                    {"libraries": [{"name": "new"}]},
                ],
            ) as request,
        ):
            self.assertEqual(client.get_libraries("n64"), [{"name": "old"}])
            clock.return_value = 59
            self.assertEqual(client.get_libraries("n64"), [{"name": "old"}])
            self.assertEqual(request.call_count, 2)
            clock.return_value = 60
            self.assertEqual(client.get_libraries("n64"), [{"name": "new"}])
            self.assertEqual(request.call_count, 4)

    def test_metadata_refreshes_only_when_version_changes(self) -> None:
        client = CromperClient("http://cromper")
        response = CromperClientCompilerTests.make_response
        with (
            patch("coreapp.cromper_client.time.monotonic", return_value=0) as clock,
            patch.object(
                client.session,
                "request",
                side_effect=[
                    response({"version": "version-a"}),
                    response({"compilers": {}}),
                    response({"version": "version-a"}),
                    response({"version": "version-b"}),
                    response({"compilers": {}}),
                ],
            ) as request,
        ):
            original = client.get_compilers()
            platforms = client._platforms_cache = {}
            clock.return_value = 59
            self.assertIs(client.get_compilers(), original)
            self.assertEqual(request.call_count, 2)
            clock.return_value = 60
            self.assertIs(client.get_compilers(), original)
            self.assertIs(client._platforms_cache, platforms)
            clock.return_value = 120
            self.assertIsNot(client.get_compilers(), original)
            self.assertIsNone(client._platforms_cache)
            self.assertEqual(request.call_count, 5)

    def test_failed_check_preserves_cache_and_limits_retries(self) -> None:
        client = CromperClient("http://cromper")
        cached = client._platforms_cache = {}
        with (
            patch("coreapp.cromper_client.time.monotonic", return_value=0) as clock,
            patch.object(
                client.session,
                "request",
                side_effect=requests.exceptions.ConnectionError("unavailable"),
            ) as request,
        ):
            self.assertIs(client.get_platforms(), cached)
            clock.return_value = 59
            self.assertIs(client.get_platforms(), cached)
            self.assertEqual(request.call_count, 1)

    def test_older_cromper_preserves_caches_without_version(self) -> None:
        client = CromperClient("http://cromper")
        platforms = client._platforms_cache = {"n64": Mock()}
        compilers = client._compilers_cache = {"ido7.1": Mock()}
        libraries = client._libraries_cache = {"n64": []}
        with patch.object(
            client,
            "_make_request",
            return_value={"status": "healthy"},
        ) as request:
            self.assertIs(client.get_platforms(), platforms)
            self.assertIs(client.get_compilers(), compilers)
            self.assertIs(client.get_libraries("n64"), libraries["n64"])
            request.assert_called_once_with("GET", "/healthz")


@asynccontextmanager
async def async_cromper_client(
    handler: Callable[[httpx.Request], httpx.Response],
) -> AsyncIterator[CromperClient]:
    """Build a cromper client backed by an in-memory httpx transport."""
    client = CromperClient("http://cromper")
    client._async_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    client._async_client_loop = asyncio.get_running_loop()
    try:
        yield client
    finally:
        await client.aclose()


class CromperClientAsyncTests(SimpleTestCase):
    @staticmethod
    def _ok_response(**payload: Any) -> httpx.Response:
        return httpx.Response(200, json={"success": True, "errors": "", **payload})

    @staticmethod
    def _elf_response(elf: bytes = b"elf") -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "success": True,
                "errors": "",
                "elf_object": base64.b64encode(elf).decode(),
            },
        )

    @staticmethod
    def _json_handler(
        payload: dict[str, Any],
    ) -> Callable[[httpx.Request], httpx.Response]:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(200, json=payload)

        return handler

    async def test_compile_uses_the_async_transport(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            self.assertEqual(request.method, "POST")
            self.assertEqual(str(request.url), "http://cromper/compile")
            self.assertEqual(
                json.loads(request.content),
                {
                    "compiler_id": "ido7.1",
                    "compiler_flags": "-O2",
                    "code": "int f(void) { return 2; }",
                    "context": "",
                    "function": "",
                    "libraries": [],
                },
            )
            return self._elf_response()

        async with async_cromper_client(handler) as client:
            result = await client.compile_code(
                "ido7.1", "-O2", "int f(void) { return 2; }", ""
            )

        self.assertEqual(result, CompilationResult(b"elf", ""))

    async def test_assemble_and_decompile_return_typed_results(self) -> None:
        asm = cast(Any, SimpleNamespace(data="nop", hash="asm-hash"))

        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path == "/assemble":
                return self._ok_response(
                    hash="result-hash",
                    arch="mips",
                    elf_object=base64.b64encode(b"elf").decode(),
                )
            return self._ok_response(decompiled_code="int f(void) {}")

        async with async_cromper_client(handler) as client:
            assembled = await client.assemble_asm("n64", asm)
            decompiled = await client.decompile("n64", "ido7.1", "nop")

        self.assertEqual(assembled, AssemblyResult("result-hash", "mips", b"elf"))
        self.assertEqual(decompiled, "int f(void) {}")

    async def test_diff_base64_encodes_the_elf_objects(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            payload = json.loads(request.content)
            self.assertEqual(
                payload["target_elf"], base64.b64encode(b"target").decode()
            )
            self.assertEqual(
                payload["compiled_elf"], base64.b64encode(b"compiled").decode()
            )
            return self._ok_response(result={"current_score": 10})

        async with async_cromper_client(handler) as client:
            result = await client.diff("n64", b"target", b"compiled")

        self.assertEqual(result, DiffResult({"current_score": 10}, ""))

    async def test_timeout_maps_to_timeout_error(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.ReadTimeout("timed out", request=request)

        async with async_cromper_client(handler) as client:
            with self.assertRaises(CromperTimeoutError) as raised:
                await client.compile_code("ido7.1", "", "code", "")

            self.assertTrue(client._had_transport_failure)

        self.assertNotIsInstance(raised.exception, CromperUnavailableError)
        self.assertIsInstance(raised.exception.__cause__, httpx.ReadTimeout)

    async def test_connect_error_maps_to_unavailable(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("connection refused", request=request)

        async with async_cromper_client(handler) as client:
            with self.assertRaises(CromperUnavailableError) as raised:
                await client.compile_code("ido7.1", "", "code", "")

            self.assertTrue(client._had_transport_failure)

        self.assertIsInstance(raised.exception.__cause__, httpx.ConnectError)

    async def test_http_error_includes_detail_and_is_not_unavailable(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(400, json={"error": "invalid compiler_id"})

        async with async_cromper_client(handler) as client:
            with self.assertRaisesMessage(
                CromperError,
                "cromper /compile returned HTTP 400: invalid compiler_id",
            ):
                await client.compile_code("ido7.1", "", "code", "")

            self.assertFalse(client._had_transport_failure)

    async def test_service_unavailable_is_reported_as_unavailable(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(503, json={"error": "service unavailable"})

        async with async_cromper_client(handler) as client:
            with self.assertRaisesMessage(
                CromperUnavailableError,
                "cromper /compile returned HTTP 503: service unavailable",
            ):
                await client.compile_code("ido7.1", "", "code", "")

            self.assertFalse(client._had_transport_failure)

    async def test_busy_is_distinct_from_unavailable_and_is_not_retried(self) -> None:
        requests_seen: list[httpx.Request] = []

        def handler(request: httpx.Request) -> httpx.Response:
            requests_seen.append(request)
            return httpx.Response(
                429,
                json={"error": "cromper is at capacity"},
                headers={"Retry-After": "1"},
            )

        async with async_cromper_client(handler) as client:
            cached = client._compilers_cache = {}
            with self.assertRaises(CromperBusyError) as raised:
                await client.compile_code("ido7.1", "", "code", "")

            self.assertEqual(len(requests_seen), 1)
            self.assertEqual(raised.exception.status_code, 429)
            self.assertEqual(raised.exception.code, "TooManyRequests")
            self.assertEqual(raised.exception.retry_after, 1)
            self.assertIn("busy", raised.exception.detail)
            self.assertNotIsInstance(raised.exception, CromperUnavailableError)
            self.assertFalse(client._had_transport_failure)
            self.assertIs(client._compilers_cache, cached)

    async def test_malformed_json_is_a_protocol_error(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return httpx.Response(
                200,
                content=b"not json",
                headers={"content-type": "application/json"},
            )

        async with async_cromper_client(handler) as client:
            with self.assertRaises(CromperError) as raised:
                await client.compile_code("ido7.1", "", "code", "")

            self.assertNotIsInstance(raised.exception, CromperUnavailableError)
            self.assertFalse(client._had_transport_failure)

    async def test_transport_recovery_invalidates_caches(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return self._elf_response()

        async with async_cromper_client(handler) as client:
            client._compilers_cache = {"stale": Mock()}
            client._platforms_cache = {"stale": Mock()}
            client._libraries_cache = {"n64": [{"name": "stale"}]}
            client._had_transport_failure = True

            await client.compile_code("ido7.1", "", "code", "")

            self.assertIsNone(client._compilers_cache)
            self.assertIsNone(client._platforms_cache)
            self.assertNotIn("n64", client._libraries_cache)
            self.assertFalse(client._had_transport_failure)

    async def test_async_client_is_opened_once_reused_and_closed(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            return self._elf_response()

        client = CromperClient("http://cromper")
        self.assertIsNone(client._async_client)
        with patch(
            "coreapp.cromper_client.httpx.AsyncClient",
            return_value=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
        ) as factory:
            await client.aopen()
            await client.aopen()
            await client.compile_code("ido7.1", "", "code", "")
            created = client._async_client
            assert created is not None
            await client.compile_code("ido7.1", "", "code", "")

        factory.assert_called_once_with(timeout=10, limits=_ASYNC_LIMITS)
        self.assertIs(client._async_client, created)

        await client.aclose()
        self.assertIsNone(client._async_client)
        self.assertTrue(created.is_closed)

    def test_clients_without_asgi_lifespan_are_closed_in_each_event_loop(self) -> None:
        # WSGI's async_to_sync bridge uses short-lived loops without ASGI lifespan.
        client = CromperClient("http://cromper")
        payload = {
            "success": True,
            "errors": "",
            "elf_object": base64.b64encode(b"elf").decode(),
        }
        created: list[httpx.AsyncClient] = []
        real_async_client = httpx.AsyncClient

        def make_client(**kwargs: Any) -> httpx.AsyncClient:
            instance = real_async_client(
                transport=httpx.MockTransport(self._json_handler(payload))
            )
            created.append(instance)
            return instance

        async def compile_once() -> CompilationResult:
            return await client.compile_code("ido7.1", "", "code", "")

        with patch("coreapp.cromper_client.httpx.AsyncClient", side_effect=make_client):
            first = asyncio.run(compile_once())
            second = asyncio.run(compile_once())

        self.assertEqual(first, CompilationResult(b"elf", ""))
        self.assertEqual(second, CompilationResult(b"elf", ""))
        self.assertEqual(len(created), 2)
        self.assertTrue(all(instance.is_closed for instance in created))
        self.assertIsNone(client._async_client)

    async def test_compile_rejects_missing_or_malformed_elf_object(self) -> None:
        for payload, message in (
            ({"success": True}, "Invalid /compile response: missing elf_object"),
            (
                {"success": True, "elf_object": "not base64!"},
                "Invalid /compile response: malformed elf_object",
            ),
        ):
            with self.subTest(payload=payload):
                async with async_cromper_client(self._json_handler(payload)) as client:
                    with self.assertRaisesMessage(CromperError, message):
                        await client.compile_code("ido7.1", "", "code", "")

    async def test_assemble_rejects_missing_fields(self) -> None:
        asm = cast(Any, SimpleNamespace(data="nop", hash="asm-hash"))
        valid = {
            "success": True,
            "hash": "result-hash",
            "arch": "mips",
            "elf_object": base64.b64encode(b"elf").decode(),
        }

        for field in ("hash", "arch", "elf_object"):
            payload = {k: v for k, v in valid.items() if k != field}
            with self.subTest(field=field):
                async with async_cromper_client(self._json_handler(payload)) as client:
                    with self.assertRaisesMessage(
                        CromperError, f"Invalid /assemble response: missing {field}"
                    ):
                        await client.assemble_asm("n64", asm)

    async def test_assemble_failure_raises_assembly_error(self) -> None:
        asm = cast(Any, SimpleNamespace(data="nop", hash="asm-hash"))
        payload = {"success": False, "error": "Assembly failed: bad asm"}

        async with async_cromper_client(self._json_handler(payload)) as client:
            with self.assertRaisesMessage(AssemblyError, "Assembly failed: bad asm"):
                await client.assemble_asm("n64", asm)

    async def test_assemble_transport_failure_is_not_an_assembly_error(self) -> None:
        asm = cast(Any, SimpleNamespace(data="nop", hash="asm-hash"))

        def handler(request: httpx.Request) -> httpx.Response:
            raise httpx.ConnectError("connection refused", request=request)

        async with async_cromper_client(handler) as client:
            with self.assertRaises(CromperUnavailableError):
                await client.assemble_asm("n64", asm)

    async def test_diff_requires_result(self) -> None:
        async with async_cromper_client(
            self._json_handler({"success": True})
        ) as client:
            with self.assertRaisesMessage(
                CromperError, "Invalid /diff response: missing result"
            ):
                await client.diff("n64", b"target", b"compiled")

    async def test_decompile_requires_decompiled_code(self) -> None:
        async with async_cromper_client(
            self._json_handler({"success": True})
        ) as client:
            with self.assertRaisesMessage(
                CromperError,
                "Invalid /decompile response: missing decompiled_code",
            ):
                await client.decompile("n64", "ido7.1", "asm")
