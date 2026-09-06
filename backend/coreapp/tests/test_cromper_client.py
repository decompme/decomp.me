from unittest.mock import patch

from django.test import SimpleTestCase

from coreapp.cromper_client import CromperClient, CromperError


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
