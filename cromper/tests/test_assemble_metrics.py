import json
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock, patch

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from cromper.error import AssemblyError
from cromper.handlers.assemble import AssembleHandler, assemble_asm
from cromper.wrappers.compiler_wrapper import AssemblyResult


def make_config():
    platforms = Mock()

    def from_id(platform_id):
        if platform_id != "n64":
            raise ValueError("Unknown platform")
        return SimpleNamespace(id="n64")

    platforms.from_id.side_effect = from_id
    return SimpleNamespace(platforms_instance=platforms)


class AssembleTimingTests(TestCase):
    def test_worker_returns_timing_for_success_and_assembly_failure(self):
        for failure in (False, True):
            with (
                self.subTest(failure=failure),
                patch("cromper.handlers.assemble.CompilerWrapper") as wrapper,
                patch(
                    "cromper.handlers.assemble.time.perf_counter",
                    side_effect=[10, 10.25],
                ),
            ):
                if failure:
                    wrapper.return_value.assemble_asm.side_effect = AssemblyError(
                        "bad code"
                    )
                else:
                    wrapper.return_value.assemble_asm.return_value = AssemblyResult(
                        hash="asm-hash", arch="mips", elf_object=b"elf"
                    )
                result, duration = assemble_asm(
                    {"platform_id": "n64", "asm_data": "nop"}, make_config()
                )
                self.assertEqual(duration, 250)
                self.assertEqual(result["success"], not failure)
                self.assertNotIn("duration", result)


class AssembleMetricsTests(AsyncHTTPTestCase):
    def get_app(self):
        executor = ThreadPoolExecutor(max_workers=1)
        self.addCleanup(executor.shutdown)
        return tornado.web.Application(
            [
                (
                    r"/assemble",
                    AssembleHandler,
                    {"config": make_config(), "executor": executor},
                )
            ]
        )

    def setUp(self):
        super().setUp()
        self.metrics = Mock()
        self.metrics_patch = patch("cromper.handlers.metrics.metrics", self.metrics)
        self.metrics_patch.start()
        self.addCleanup(self.metrics_patch.stop)

    def request_assemble(self, body):
        return self.fetch(
            "/assemble",
            method="POST",
            body=body,
            headers={"Content-Type": "application/json"},
        )

    def test_success_and_failure_emit_metrics_without_changing_response(self):
        for success in (True, False):
            self.metrics.reset_mock()
            result = (
                {
                    "success": True,
                    "elf_object": "ZWxm",
                    "hash": "asm-hash",
                    "arch": "mips",
                }
                if success
                else {"success": False, "error": "bad code"}
            )
            with patch(
                "cromper.handlers.assemble.assemble_asm", return_value=(result, 250)
            ):
                response = self.request_assemble(
                    json.dumps({"platform_id": "n64", "asm_data": "éabc"})
                )
            self.assertEqual(response.code, 200)
            self.assertEqual(json.loads(response.body), result)
            attrs = {
                "platform": "n64",
                "input_size": 4,
                "outcome": "success" if success else "assembly_error",
            }
            self.metrics.count.assert_called_once_with(
                "cromper.assemble.requests", 1, attributes=attrs
            )
            calls = {
                call.args[0]: call for call in self.metrics.distribution.call_args_list
            }
            self.assertEqual(
                set(calls),
                {
                    "cromper.assemble.duration",
                    "cromper.assemble.request_duration",
                    "cromper.assemble.input_size",
                },
            )
            self.assertEqual(calls["cromper.assemble.duration"].args[1], 250)
            self.assertEqual(calls["cromper.assemble.input_size"].args[1], 4)
            self.assertGreaterEqual(
                calls["cromper.assemble.request_duration"].args[1], 0
            )
            for name, call in calls.items():
                self.assertEqual(call.kwargs["attributes"], attrs)
                if name.endswith("duration"):
                    self.assertEqual(call.kwargs["unit"], "millisecond")

    def test_invalid_requests_are_counted_with_bounded_identifiers(self):
        for body in (
            "invalid json",
            json.dumps({"platform_id": "user-provided-id"}),
            "{}",
        ):
            self.metrics.reset_mock()
            response = self.request_assemble(body)
            self.assertEqual(response.code, 400)
            attrs = self.metrics.count.call_args.kwargs["attributes"]
            self.assertEqual(attrs["outcome"], "invalid_request")
            self.assertEqual(attrs["platform"], "unknown")
            self.assertNotIn(
                "cromper.assemble.duration",
                [call.args[0] for call in self.metrics.distribution.call_args_list],
            )

    def test_unexpected_worker_failure_is_counted(self):
        with patch(
            "cromper.handlers.assemble.assemble_asm",
            side_effect=RuntimeError("worker failed"),
        ):
            response = self.request_assemble(
                json.dumps({"platform_id": "n64", "asm_data": "nop"})
            )
        self.assertEqual(response.code, 500)
        self.assertEqual(
            self.metrics.count.call_args.kwargs["attributes"]["outcome"],
            "internal_error",
        )
