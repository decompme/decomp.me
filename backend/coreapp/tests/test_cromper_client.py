import base64
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import Mock, patch

import requests
from django.test import SimpleTestCase

from coreapp.cromper_client import (
    CromperClient,
    CromperError,
    CromperTimeoutError,
    CromperUnavailableError,
)
from coreapp.error import AssemblyError
from coreapp.wrapper_result import AssemblyResult, CompilationResult, DiffResult


class CromperClientCompilerTests(SimpleTestCase):
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

    def test_compile_returns_typed_result(self) -> None:
        client = CromperClient("http://cromper")
        response = {
            "success": True,
            "elf_object": base64.b64encode(b"elf").decode(),
            "errors": "warning",
        }

        with patch.object(client, "_make_request", return_value=response):
            result = client.compile_code("ido7.1", "", "code", "context")

        self.assertEqual(result, CompilationResult(b"elf", "warning"))

    def test_compile_rejects_missing_or_malformed_elf_object(self) -> None:
        client = CromperClient("http://cromper")

        for response, message in (
            ({"success": True}, "Invalid /compile response: missing elf_object"),
            (
                {"success": True, "elf_object": "not base64!"},
                "Invalid /compile response: malformed elf_object",
            ),
        ):
            with (
                self.subTest(response=response),
                patch.object(client, "_make_request", return_value=response),
                self.assertRaisesMessage(CromperError, message),
            ):
                client.compile_code("ido7.1", "", "code", "context")

    def test_assemble_returns_typed_result_and_requires_fields(self) -> None:
        client = CromperClient("http://cromper")
        asm = cast(Any, SimpleNamespace(data="nop", hash="asm-hash"))
        valid_response = {
            "success": True,
            "hash": "result-hash",
            "arch": "mips",
            "elf_object": base64.b64encode(b"elf").decode(),
        }

        with patch.object(client, "_make_request", return_value=valid_response):
            result = client.assemble_asm("n64", asm)

        self.assertEqual(result, AssemblyResult("result-hash", "mips", b"elf"))

        for field in ("hash", "arch", "elf_object"):
            response = {k: v for k, v in valid_response.items() if k != field}
            with (
                self.subTest(field=field),
                patch.object(client, "_make_request", return_value=response),
                self.assertRaisesMessage(
                    CromperError, f"Invalid /assemble response: missing {field}"
                ),
            ):
                client.assemble_asm("n64", asm)

    def test_assemble_failure_raises_assembly_error(self) -> None:
        client = CromperClient("http://cromper")
        asm = cast(Any, SimpleNamespace(data="nop", hash="asm-hash"))
        response = {"success": False, "error": "Assembly failed: bad asm"}

        with (
            patch.object(client, "_make_request", return_value=response),
            self.assertRaisesMessage(AssemblyError, "Assembly failed: bad asm"),
        ):
            client.assemble_asm("n64", asm)

    def test_assemble_transport_failure_is_not_an_assembly_error(self) -> None:
        client = CromperClient("http://cromper")
        asm = cast(Any, SimpleNamespace(data="nop", hash="asm-hash"))

        with (
            patch.object(
                client,
                "_make_request",
                side_effect=CromperUnavailableError("cromper unavailable"),
            ),
            self.assertRaises(CromperUnavailableError),
        ):
            client.assemble_asm("n64", asm)

    def test_diff_returns_typed_result_and_requires_result(self) -> None:
        client = CromperClient("http://cromper")
        response = {
            "success": True,
            "result": {"current_score": 10},
            "errors": "",
        }

        with patch.object(client, "_make_request", return_value=response):
            result = client.diff("n64", b"target", b"compiled")

        self.assertEqual(result, DiffResult({"current_score": 10}, ""))

        with (
            patch.object(client, "_make_request", return_value={"success": True}),
            self.assertRaisesMessage(
                CromperError, "Invalid /diff response: missing result"
            ),
        ):
            client.diff("n64", b"target", b"compiled")

    def test_decompile_requires_decompiled_code(self) -> None:
        client = CromperClient("http://cromper")

        with (
            patch.object(client, "_make_request", return_value={"success": True}),
            self.assertRaisesMessage(
                CromperError,
                "Invalid /decompile response: missing decompiled_code",
            ),
        ):
            client.decompile("n64", "ido7.1", "asm")
