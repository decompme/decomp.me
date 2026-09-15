from typing import cast
from unittest.mock import Mock, patch

import requests
from django.test import SimpleTestCase

from coreapp.compiler_utils import Compiler
from coreapp.cromper_client import (
    CromperClient,
    CromperError,
    CromperUnavailableError,
)


class CromperClientCompilerTests(SimpleTestCase):
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

    def test_deserializes_compiler_metadata_response(self) -> None:
        compiler_response = {
            "compilers": {
                "ido7.1": {
                    "id": "ido7.1",
                    "platform": "n64",
                    "flags_class": "ido",
                    "diff_flags_class": "mips",
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

    def test_failed_metadata_read_does_not_cache_partial_results(self) -> None:
        client = CromperClient("http://cromper")
        valid = {
            "id": "ido7.1",
            "platform": "n64",
            "flags_class": "ido",
            "diff_flags_class": "mips",
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

    def test_resolves_language_extension(self) -> None:
        client = CromperClient("http://cromper")

        with patch.object(
            client,
            "_make_request",
            return_value={"extension": "cpp"},
        ) as make_request:
            extension = client.resolve_language_extension("ido7.1", "-x c++")

        self.assertEqual(extension, "cpp")
        make_request.assert_called_once_with(
            "POST",
            "/compiler/extension",
            json={
                "compiler_id": "ido7.1",
                "compiler_flags": "-x c++",
            },
        )

    def test_connection_failure_is_marked_as_service_unavailable(self) -> None:
        client = CromperClient("http://cromper")

        with (
            patch.object(
                client.session,
                "request",
                side_effect=requests.exceptions.ConnectionError("connection refused"),
            ),
            self.assertRaises(CromperUnavailableError),
        ):
            client._make_request("GET", "/compiler")

    def test_failed_recovery_probe_propagates_and_preserves_cached_metadata(
        self,
    ) -> None:
        client = CromperClient("http://cromper")
        client._service_available = False
        cached_compilers = {"stale": cast(Compiler, Mock())}
        client._compilers_cache = cached_compilers

        with (
            patch.object(
                client,
                "_make_request",
                side_effect=CromperUnavailableError("connection still refused"),
            ) as request,
            self.assertRaises(CromperUnavailableError),
        ):
            client.get_compilers()

        request.assert_called_once_with("GET", "/healthz")
        self.assertIs(client._compilers_cache, cached_compilers)
        self.assertFalse(client._service_available)

    def test_service_recovery_reloads_metadata_after_outage(self) -> None:
        client = CromperClient("http://cromper")
        client._compilers_cache = {"stale": Mock()}
        client._platforms_cache = {"stale": Mock()}

        with (
            patch.object(
                client.session,
                "request",
                side_effect=requests.exceptions.ConnectionError("connection refused"),
            ),
            self.assertRaises(CromperUnavailableError),
        ):
            client._make_request("GET", "/compiler")

        self.assertIn("stale", client._compilers_cache)
        self.assertIn("stale", client._platforms_cache)

        health_response = Mock()
        health_response.json.return_value = {"status": "ok"}
        health_response.raise_for_status.return_value = None
        compiler_response = Mock()
        compiler_response.json.return_value = {"compilers": {}}
        compiler_response.raise_for_status.return_value = None
        with patch.object(
            client.session,
            "request",
            side_effect=[health_response, compiler_response],
        ) as request:
            self.assertEqual(client.get_compilers(), {})

        self.assertEqual(client._compilers_cache, {})
        self.assertIsNone(client._platforms_cache)

        self.assertTrue(client._service_available)
        self.assertEqual(
            [call.args[1] for call in request.call_args_list],
            [
                "http://cromper/healthz",
                "http://cromper/compiler",
            ],
        )

    def test_recovery_refreshes_cache_with_new_compiler(self) -> None:
        client = CromperClient("http://cromper")
        initial_compiler_response = {
            "compilers": {
                "ido7.1": {
                    "id": "ido7.1",
                    "platform": "n64",
                    "flags_class": "ido",
                    "diff_flags_class": "mips",
                }
            }
        }
        updated_compiler_response = {
            "compilers": {
                **initial_compiler_response["compilers"],
                "ido7.2": {
                    "id": "ido7.2",
                    "platform": "n64",
                    "flags_class": "ido",
                    "diff_flags_class": "mips",
                },
            }
        }

        initial_compilers = Mock()
        initial_compilers.json.return_value = initial_compiler_response
        initial_compilers.raise_for_status.return_value = None
        initial_platforms = Mock()
        initial_platforms.json.return_value = self.platform_response
        initial_platforms.raise_for_status.return_value = None

        health_response = Mock()
        health_response.json.return_value = {"status": "ok"}
        health_response.raise_for_status.return_value = None
        updated_compilers = Mock()
        updated_compilers.json.return_value = updated_compiler_response
        updated_compilers.raise_for_status.return_value = None
        updated_platforms = Mock()
        updated_platforms.json.return_value = self.platform_response
        updated_platforms.raise_for_status.return_value = None

        with patch.object(
            client.session,
            "request",
            side_effect=[
                initial_compilers,
                initial_platforms,
                requests.exceptions.ConnectionError("connection refused"),
                health_response,
                updated_compilers,
                updated_platforms,
            ],
        ):
            self.assertEqual(set(client.get_compilers()), {"ido7.1"})
            with self.assertRaises(CromperUnavailableError):
                client.get_libraries()

            self.assertEqual(set(client.get_compilers()), {"ido7.1", "ido7.2"})

        self.assertEqual(set(client._compilers_cache or {}), {"ido7.1", "ido7.2"})
        self.assertTrue(client._service_available)
