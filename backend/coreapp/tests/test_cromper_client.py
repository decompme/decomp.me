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
        diff_flags = [{"type": "checkbox", "id": "test", "flag": "-DIFFtest"}]
        compiler_response = {
            "compilers": {
                "ido7.1": {
                    "id": "ido7.1",
                    "platform": "n64",
                    "class": "ido",
                    "diff_flags": diff_flags,
                }
            },
            "flags": {"ido": {"flags": []}},
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
        self.assertEqual(compiler.diff_flags, diff_flags)

    def test_resolves_language(self) -> None:
        client = CromperClient("http://cromper")

        with patch.object(
            client,
            "_make_request",
            return_value={"language": "C++"},
        ) as make_request:
            language = client.resolve_language("ido7.1", "-x c++")

        self.assertEqual(language, "C++")
        make_request.assert_called_once_with(
            "POST",
            "/compiler/language",
            json={
                "compiler_id": "ido7.1",
                "compiler_flags": "-x c++",
            },
        )

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

    def test_rejects_invalid_language_response(self) -> None:
        client = CromperClient("http://cromper")

        with patch.object(
            client,
            "_make_request",
            return_value={"language": []},
        ):
            with self.assertRaisesRegex(CromperError, "Invalid language"):
                client.resolve_language("ido7.1")
