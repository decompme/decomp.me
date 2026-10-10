import json
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock, patch

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from cromper.error import CompilationError
from cromper.handlers.compile import CompileHandler, compile
from cromper.wrappers.compiler_wrapper import CompilationResult


def make_config():
    compiler = SimpleNamespace(id="test-cc", platform=SimpleNamespace(id="n64"))
    compilers = Mock()
    compilers.from_id.side_effect = lambda compiler_id: (
        compiler if compiler_id == compiler.id else raise_unknown_compiler()
    )
    return SimpleNamespace(sentry_metrics_sample_rate=1.0, compilers_instance=compilers)


def raise_unknown_compiler():
    raise ValueError("Unknown compiler")


class CompileTimingTests(TestCase):
    def test_worker_returns_timing_for_success_and_compilation_failure(self):
        for failure in (False, True):
            with (
                self.subTest(failure=failure),
                patch("cromper.handlers.compile.CompilerWrapper") as wrapper,
                patch(
                    "cromper.handlers.compile.time.perf_counter",
                    side_effect=[10, 10.25],
                ),
            ):
                if failure:
                    wrapper.return_value.compile_code.side_effect = CompilationError(
                        "bad code"
                    )
                else:
                    wrapper.return_value.compile_code.return_value = CompilationResult(
                        b"elf", ""
                    )
                result, duration = compile({"compiler_id": "test-cc"}, make_config())
                self.assertEqual(duration, 250)
                self.assertEqual(result["success"], not failure)
                self.assertNotIn("duration", result)


class CompileMetricsTests(AsyncHTTPTestCase):
    def get_app(self):
        executor = ThreadPoolExecutor(max_workers=1)
        self.addCleanup(executor.shutdown)
        return tornado.web.Application(
            [
                (
                    r"/compile",
                    CompileHandler,
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

    def request_compile(self, body):
        return self.fetch(
            "/compile",
            method="POST",
            body=body,
            headers={"Content-Type": "application/json"},
        )

    def test_success_and_failure_emit_metrics_without_changing_response(self):
        for success in (True, False):
            self.metrics.reset_mock()
            result = (
                {"success": True, "elf_object": "ZWxm", "errors": ""}
                if success
                else {"success": False, "error": "bad code"}
            )
            with patch("cromper.handlers.compile.compile", return_value=(result, 250)):
                response = self.request_compile(
                    json.dumps(
                        {"compiler_id": "test-cc", "code": "é", "context": "abc"}
                    )
                )
            self.assertEqual(response.code, 200)
            self.assertEqual(json.loads(response.body), result)
            attrs = {
                "compiler_id": "test-cc",
                "platform": "n64",
                "input_size": 4,
                "outcome": "success" if success else "compilation_error",
            }
            self.metrics.count.assert_called_once_with(
                "cromper.compile.requests", 1, attributes=attrs
            )
            calls = {
                call.args[0]: call for call in self.metrics.distribution.call_args_list
            }
            self.assertEqual(
                set(calls),
                {
                    "cromper.compile.duration",
                    "cromper.compile.request_duration",
                    "cromper.compile.input_size",
                },
            )
            self.assertEqual(calls["cromper.compile.duration"].args[1], 250)
            self.assertEqual(calls["cromper.compile.input_size"].args[1], 4)
            self.assertGreaterEqual(
                calls["cromper.compile.request_duration"].args[1], 0
            )
            for name, call in calls.items():
                self.assertEqual(call.kwargs["attributes"], attrs)
                if name.endswith("duration"):
                    self.assertEqual(call.kwargs["unit"], "millisecond")

    def test_invalid_requests_are_counted_with_bounded_identifiers(self):
        for body in (
            "invalid json",
            json.dumps({"compiler_id": "user-provided-id"}),
            "{}",
        ):
            self.metrics.reset_mock()
            response = self.request_compile(body)
            self.assertEqual(response.code, 400)
            attrs = self.metrics.count.call_args.kwargs["attributes"]
            self.assertEqual(attrs["outcome"], "invalid_request")
            self.assertEqual(attrs["compiler_id"], "unknown")
            self.assertEqual(attrs["platform"], "unknown")
            self.assertNotIn(
                "cromper.compile.duration",
                [call.args[0] for call in self.metrics.distribution.call_args_list],
            )

    def test_unexpected_worker_failure_is_counted(self):
        with patch(
            "cromper.handlers.compile.compile",
            side_effect=RuntimeError("worker failed"),
        ):
            response = self.request_compile(json.dumps({"compiler_id": "test-cc"}))
        self.assertEqual(response.code, 500)
        self.assertEqual(
            self.metrics.count.call_args.kwargs["attributes"]["outcome"],
            "internal_error",
        )
