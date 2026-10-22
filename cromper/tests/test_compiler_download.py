import importlib.util
import sys
import unittest
from pathlib import Path
from types import ModuleType
from typing import Any
from unittest.mock import patch


def load_download_module() -> ModuleType:
    path = Path(__file__).resolve().parents[1] / "compilers" / "download.py"
    spec = importlib.util.spec_from_file_location("compilers_download", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class CompilerDownloadTests(unittest.TestCase):
    def setUp(self) -> None:
        self.download = load_download_module()

    def run_main(self, results: dict[str, Any]) -> tuple[Any, list[str]]:
        def fake_get_compiler_raw(
            platform_id: str, compiler_id: str, **kwargs: Any
        ) -> bool | None:
            result = results[compiler_id]
            if isinstance(result, Exception):
                raise result
            return result

        argv = [
            "download.py",
            "--compilers-dir",
            "/nonexistent",
            "--platforms",
            "gba",
            "--compilers",
            *results.keys(),
            "--threads",
            "2",
        ]
        with (
            patch.object(sys, "argv", argv),
            patch.object(self.download.platform, "system", return_value="Linux"),
            patch.object(
                self.download, "get_compiler_raw", side_effect=fake_get_compiler_raw
            ),
            self.assertLogs(self.download.logger, level="INFO") as logs,
        ):
            ret = self.download.main()
        return ret, logs.output

    def test_failed_downloads_are_reported(self) -> None:
        ret, output = self.run_main(
            {
                "agbcc": True,
                "agbccpp": ConnectionError("Connection aborted."),
                "gcc2.96": False,
            }
        )
        self.assertEqual(ret, 1)
        summary = [line for line in output if "Updated" in line]
        self.assertEqual(len(summary), 1)
        self.assertIn("Updated 1 / 3 compiler(s)", summary[0])
        self.assertTrue(any("2 compiler(s) failed" in line for line in output), output)

    def test_successful_run_exits_zero(self) -> None:
        ret, output = self.run_main({"agbcc": True, "agbccpp": None})
        self.assertEqual(ret, 0)
        self.assertTrue(
            any("Updated 1 / 2 compiler(s)" in line for line in output), output
        )
