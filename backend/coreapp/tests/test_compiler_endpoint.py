from typing import Any

from django.urls import reverse
from rest_framework.test import APITestCase

from coreapp.compilers import GCC281PM


class CompilerEndpointTests(APITestCase):
    def assert_compilers_response(self, data: dict[str, Any]) -> None:
        self.assertIn("compilers", data)
        self.assertIsInstance(data["compilers"], dict)
        self.assertIn("flags", data)
        self.assertIsInstance(data["flags"], dict)
        self.assertIn("diff_flags", data)
        self.assertIsInstance(data["diff_flags"], dict)

        for compiler in data["compilers"].values():
            self.assertIn("id", compiler)
            self.assertIn("class", compiler)
            self.assertIn("diff_class", compiler)
            self.assertNotIn("flags", compiler)
            self.assertNotIn("diff_flags", compiler)
            self.assertIn(compiler["class"], data["flags"])
            self.assertIn(compiler["diff_class"], data["diff_flags"])

        for field in ("flags", "diff_flags"):
            for flag_class in data[field].values():
                self.assertIsInstance(flag_class["flags"], list)
                if "parent" in flag_class:
                    self.assertIn(flag_class["parent"], data[field])

    def test_compilers_endpoint(self) -> None:
        response = self.client.get(reverse("compilers"))

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assert_compilers_response(data)
        self.assertIn("platforms", data)

    def test_platform_compilers_endpoint(self) -> None:
        response = self.client.get(
            reverse(
                "available-compilers",
                kwargs={"platform": GCC281PM.platform.id},
            )
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assert_compilers_response(data)
        for compiler in data["compilers"].values():
            self.assertEqual(compiler["platform"], GCC281PM.platform.id)

    def test_single_compiler_endpoint(self) -> None:
        response = self.client.get(
            reverse(
                "available-compiler",
                kwargs={
                    "platform": GCC281PM.platform.id,
                    "compiler": GCC281PM.id,
                },
            )
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assert_compilers_response(data)
        self.assertEqual(list(data["compilers"]), [GCC281PM.id])
        compiler = data["compilers"][GCC281PM.id]
        self.assertEqual(compiler["class"], "gcc")
        self.assertEqual(compiler["diff_class"], "mips")
        self.assertIn("gcc", data["flags"])
        self.assertEqual(data["diff_flags"]["mips"]["parent"], "common")
