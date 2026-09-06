"""
Test cromper API endpoints.
"""

import json
import unittest
from tornado.testing import AsyncHTTPTestCase

from cromper.platforms import N64
from cromper.main import CromperConfig, make_app


class CromperAPITests(AsyncHTTPTestCase):
    """Test cromper HTTP API endpoints."""

    def get_app(self):
        """Return the Tornado application for testing."""
        config = CromperConfig()
        return make_app(config)

    def test_health_endpoint(self):
        """Test the health check endpoint."""
        response = self.fetch("/health")
        self.assertEqual(response.code, 200)

        data = json.loads(response.body)
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["service"], "cromper")

    def test_platforms_endpoint(self):
        """Test the platforms endpoint."""
        response = self.fetch("/platform")
        self.assertEqual(response.code, 200)

        data = json.loads(response.body)
        self.assertIsInstance(data, dict)
        self.assertGreater(len(data), 0)

    # def test_platforms_endpoint_single(self):
    #     """Test the platforms endpoint."""
    #     response = self.fetch("/platform/compiler_id")
    #     self.assertEqual(response.code, 200)
    #     data = json.loads(response.body)

    def test_compilers_endpoint(self):
        """Test the compilers endpoint."""
        response = self.fetch("/compiler")
        self.assertEqual(response.code, 200)

        data = json.loads(response.body)
        self.assertIn("compilers", data)
        self.assertIsInstance(data["compilers"], dict)
        self.assertGreater(len(data["compilers"]), 0)
        self.assertIn("flags", data)
        self.assertIsInstance(data["flags"], dict)

        for compiler in data["compilers"].values():
            self.assertIn("flags_class", compiler)
            self.assertNotIn("diff_flags", compiler)
            self.assertIn(compiler["diff_flags_class"], data["diff_flags"])
            self.assertNotIn("flags", compiler)
            self.assertNotIn("language", compiler)
            self.assertIn(compiler["flags_class"], data["flags"])

        for field in ("flags", "diff_flags"):
            for flag_class in data[field].values():
                self.assertIsInstance(flag_class["flags"], list)
                if "parent" in flag_class:
                    self.assertIn(flag_class["parent"], data[field])

    def test_compilers_endpoint_platform(self):
        """Test platform-filtered compiler metadata and flag classes."""
        response = self.fetch(f"/compiler/{N64.id}")
        self.assertEqual(response.code, 200)

        data = json.loads(response.body)
        self.assertIn("compilers", data)
        self.assertIn("flags", data)
        self.assertTrue(data["compilers"])
        for compiler in data["compilers"].values():
            self.assertEqual(compiler["platform"], N64.id)
            self.assertIn(compiler["flags_class"], data["flags"])

    def test_compilers_endpoint_single(self):
        """Test a single compiler includes its required flag-class ancestry."""
        response = self.fetch(f"/compiler/{N64.id}/gcc2.8.1pm")
        self.assertEqual(response.code, 200)

        data = json.loads(response.body)
        self.assertEqual(list(data["compilers"]), ["gcc2.8.1pm"])
        compiler = data["compilers"]["gcc2.8.1pm"]
        self.assertEqual(compiler["flags_class"], "gcc")
        self.assertIn("gcc", data["flags"])
        self.assertEqual(compiler["diff_flags_class"], "mips")
        self.assertEqual(set(data["flags"]), {"gcc"})
        self.assertEqual(set(data["diff_flags"]), {"common", "mips"})
        self.assertEqual(data["diff_flags"]["mips"]["parent"], "common")

    def test_compiler_language_endpoint(self):
        """Test resolving the effective language from compiler flags."""
        response = self.fetch(
            "/compiler/language",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=json.dumps(
                {
                    "compiler_id": "ee-gcc2.9-991111",
                    "compiler_flags": "-O2 -x c++",
                }
            ),
        )
        self.assertEqual(response.code, 200)

        data = json.loads(response.body)
        self.assertEqual(data["language"], "C++")
        self.assertNotIn("extension", data)

    def test_compiler_extension_endpoint(self):
        """Test resolving the effective source extension from compiler flags."""
        response = self.fetch(
            "/compiler/extension",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=json.dumps(
                {
                    "compiler_id": "ee-gcc2.9-991111",
                    "compiler_flags": "-O2 -x c++",
                }
            ),
        )
        self.assertEqual(response.code, 200)

        data = json.loads(response.body)
        self.assertEqual(data["extension"], "cpp")
        self.assertNotIn("language", data)

    def test_compiler_language_endpoint_unknown_compiler(self):
        response = self.fetch(
            "/compiler/language",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=json.dumps(
                {
                    "compiler_id": "nonexistent_compiler",
                    "compiler_flags": "",
                }
            ),
        )
        self.assertEqual(response.code, 404)

    def test_compiler_language_endpoint_rejects_invalid_flags(self):
        response = self.fetch(
            "/compiler/language",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=json.dumps(
                {
                    "compiler_id": "gcc2.8.1pm",
                    "compiler_flags": [],
                }
            ),
        )
        self.assertEqual(response.code, 400)

    def test_libraries_endpoint(self):
        """Test the libraries endpoint."""
        response = self.fetch("/library")
        self.assertEqual(response.code, 200)

        data = json.loads(response.body)
        self.assertIn("libraries", data)
        self.assertIsInstance(data["libraries"], list)

    def test_libraries_endpoint_with_platform_filter(self):
        """Test the libraries endpoint with platform filtering."""
        response = self.fetch("/library?platform=n64")
        self.assertEqual(response.code, 200)

        data = json.loads(response.body)
        self.assertIn("libraries", data)
        self.assertIsInstance(data["libraries"], list)

        # All libraries should be for n64 platform
        for lib in data["libraries"]:
            self.assertEqual(lib["platform"], "n64")

    def test_compile_endpoint_missing_compiler(self):
        """Test compilation endpoint with missing compiler_id."""
        body = json.dumps(
            {
                "compiler_flags": "",
                "code": "int main() { return 0; }",
                "context": "",
            }
        )

        response = self.fetch(
            "/compile",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=body,
        )

        self.assertEqual(response.code, 400)

    def test_compile_endpoint_invalid_compiler(self):
        """Test compilation endpoint with invalid compiler_id."""
        body = json.dumps(
            {
                "compiler_id": "nonexistent_compiler",
                "compiler_flags": "",
                "code": "int main() { return 0; }",
                "context": "",
            }
        )

        response = self.fetch(
            "/compile",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=body,
        )

        self.assertEqual(response.code, 400)

    def test_assemble_endpoint_missing_platform(self):
        """Test assembly endpoint with missing platform_id."""
        body = json.dumps(
            {
                "asm_data": ".text\\nmain:\\n    nop\\n",
                "asm_hash": "test_hash",
            }
        )

        response = self.fetch(
            "/assemble",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=body,
        )

        self.assertEqual(response.code, 400)

    def test_diff_endpoint_missing_data(self):
        """Test diff endpoint with missing required data."""
        body = json.dumps(
            {
                "platform_id": N64.id,
                # Missing target_asm_data and compiled_elf
            }
        )

        response = self.fetch(
            "/diff",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=body,
        )

        self.assertEqual(response.code, 400)

    def test_decompile_endpoint_missing_params(self):
        """Test decompile endpoint with missing required parameters."""
        body = json.dumps(
            {
                "platform_id": N64.id,
                # Missing compiler_id and asm
            }
        )

        response = self.fetch(
            "/decompile",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=body,
        )

        self.assertEqual(response.code, 400)

    def test_cors_headers(self):
        """Test that CORS headers are properly set."""
        response = self.fetch("/health")

        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "*")
        self.assertEqual(
            response.headers.get("Content-Type"), "application/json; charset=UTF-8"
        )

    def test_options_request(self):
        """Test that OPTIONS requests are handled correctly."""
        response = self.fetch("/compile", method="OPTIONS")
        self.assertEqual(response.code, 204)
        self.assertEqual(response.headers.get("Access-Control-Allow-Origin"), "*")
        self.assertIn("POST", response.headers.get("Access-Control-Allow-Methods", ""))

    def test_invalid_json(self):
        """Test endpoint with invalid JSON."""
        response = self.fetch(
            "/compile",
            method="POST",
            headers={"Content-Type": "application/json"},
            body="invalid json",
        )

        self.assertEqual(response.code, 400)


if __name__ == "__main__":
    unittest.main()
