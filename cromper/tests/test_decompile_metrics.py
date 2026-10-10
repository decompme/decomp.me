import json
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock, patch

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from cromper.handlers.decompile import DecompileHandler, decompile


def make_config():
    platforms = Mock()
    compilers = Mock()

    def platform_from_id(value):
        if value != "n64":
            raise ValueError("Unknown platform")
        return SimpleNamespace(id="n64")

    def compiler_from_id(value):
        if value != "test-cc":
            raise ValueError("Unknown compiler")
        return SimpleNamespace(id="test-cc")

    platforms.from_id.side_effect = platform_from_id
    compilers.from_id.side_effect = compiler_from_id
    return SimpleNamespace(
        sentry_metrics_sample_rate=1.0,
        platforms_instance=platforms,
        compilers_instance=compilers,
    )


def decompile_data():
    return {
        "platform_id": "n64",
        "compiler_id": "test-cc",
        "context": "éabc",
        "asm": "nop",
    }


class DecompileTimingTests(TestCase):
    def test_worker_returns_timing_for_success_and_failure(self):
        for failure in (False, True):
            with (
                self.subTest(failure=failure),
                patch("cromper.handlers.decompile.DecompilerWrapper") as wrapper,
                patch(
                    "cromper.handlers.decompile.time.perf_counter",
                    side_effect=[10, 10.25],
                ),
            ):
                if failure:
                    wrapper.return_value.decompile.side_effect = ValueError("bad asm")
                else:
                    wrapper.return_value.decompile.return_value = "int foo() {}"
                result, duration = decompile(decompile_data(), make_config())
                self.assertEqual(duration, 250)
                self.assertEqual(
                    result,
                    {"success": False, "error": "bad asm"}
                    if failure
                    else {"success": True, "decompiled_code": "int foo() {}"},
                )


class DecompileMetricsTests(AsyncHTTPTestCase):
    def get_app(self):
        executor = ThreadPoolExecutor(max_workers=1)
        self.addCleanup(executor.shutdown)
        return tornado.web.Application(
            [
                (
                    r"/decompile",
                    DecompileHandler,
                    {"config": make_config(), "executor": executor},
                )
            ]
        )

    def setUp(self):
        super().setUp()
        self.metrics = Mock()
        patcher = patch("cromper.handlers.metrics.metrics", self.metrics)
        patcher.start()
        self.addCleanup(patcher.stop)

    def request_decompile(self, body):
        return self.fetch(
            "/decompile",
            method="POST",
            body=body,
            headers={"Content-Type": "application/json"},
        )

    def test_success_and_failure_metrics_preserve_response(self):
        for success in (True, False):
            self.metrics.reset_mock()
            result = (
                {"success": True, "decompiled_code": "int foo() {}"}
                if success
                else {"success": False, "error": "bad asm"}
            )
            with patch(
                "cromper.handlers.decompile.decompile", return_value=(result, 250)
            ):
                response = self.request_decompile(json.dumps(decompile_data()))
            self.assertEqual(response.code, 200)
            self.assertEqual(json.loads(response.body), result)
            attrs = {
                "platform": "n64",
                "compiler_id": "test-cc",
                "context_size": 4,
                "asm_size": 3,
                "outcome": "success" if success else "decompilation_error",
            }
            self.metrics.count.assert_called_once_with(
                "cromper.decompile.requests", 1, attributes=attrs
            )
            calls = {
                call.args[0]: call for call in self.metrics.distribution.call_args_list
            }
            self.assertEqual(
                set(calls),
                {
                    "cromper.decompile.duration",
                    "cromper.decompile.request_duration",
                    "cromper.decompile.context_size",
                    "cromper.decompile.asm_size",
                },
            )
            self.assertEqual(calls["cromper.decompile.duration"].args[1], 250)
            self.assertEqual(calls["cromper.decompile.context_size"].args[1], 4)
            self.assertEqual(calls["cromper.decompile.asm_size"].args[1], 3)
            for name, call in calls.items():
                self.assertEqual(call.kwargs["attributes"], attrs)
                self.assertEqual(
                    call.kwargs["unit"],
                    "millisecond" if name.endswith("duration") else None,
                )

    def test_invalid_requests_and_identifiers(self):
        for data in (
            {},
            {"platform_id": "untrusted", "compiler_id": "untrusted"},
            {"platform_id": "n64", "compiler_id": "test-cc"},
        ):
            self.metrics.reset_mock()
            response = self.request_decompile(json.dumps(data))
            self.assertEqual(response.code, 400)
            attrs = self.metrics.count.call_args.kwargs["attributes"]
            self.assertEqual(attrs["outcome"], "invalid_request")
            self.assertIn(attrs["platform"], ("unknown", "n64"))
            self.assertIn(attrs["compiler_id"], ("unknown", "test-cc"))
            self.assertNotIn(
                "cromper.decompile.duration",
                [call.args[0] for call in self.metrics.distribution.call_args_list],
            )

    def test_invalid_json_is_counted_without_sizes(self):
        response = self.request_decompile("invalid json")
        self.assertEqual(response.code, 400)
        self.assertEqual(
            self.metrics.count.call_args.kwargs["attributes"]["outcome"],
            "invalid_request",
        )
        self.assertEqual(
            [call.args[0] for call in self.metrics.distribution.call_args_list],
            ["cromper.decompile.request_duration"],
        )

    def test_worker_failure_is_counted(self):
        with patch(
            "cromper.handlers.decompile.decompile",
            side_effect=RuntimeError("worker failed"),
        ):
            response = self.request_decompile(json.dumps(decompile_data()))
        self.assertEqual(response.code, 500)
        self.assertEqual(
            self.metrics.count.call_args.kwargs["attributes"]["outcome"],
            "internal_error",
        )
