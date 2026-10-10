import base64
import json
from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock, patch

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from cromper.handlers.diff import DiffHandler, generate_diff


def make_config():
    platforms = Mock()

    def from_id(platform_id):
        if platform_id != "n64":
            raise ValueError("Unknown platform")
        return SimpleNamespace(id="n64")

    platforms.from_id.side_effect = from_id
    return SimpleNamespace(sentry_metrics_sample_rate=1.0, platforms_instance=platforms)


def diff_data():
    return {
        "platform_id": "n64",
        "target_elf": base64.b64encode(b"target").decode(),
        "compiled_elf": base64.b64encode(b"compiled object").decode(),
    }


class DiffTimingTests(TestCase):
    def test_worker_measures_decoded_sizes_and_times_success_and_failure(self):
        for failure in (False, True):
            with (
                self.subTest(failure=failure),
                patch("cromper.handlers.diff.DiffWrapper") as wrapper,
                patch(
                    "cromper.handlers.diff.time.perf_counter", side_effect=[10, 10.25]
                ),
            ):
                if failure:
                    wrapper.return_value.diff.side_effect = ValueError("diff failed")
                else:
                    wrapper.return_value.diff.return_value = SimpleNamespace(
                        result={"score": 0}, errors=""
                    )
                result, duration, sizes = generate_diff(diff_data(), make_config())
                self.assertEqual(result["success"], not failure)
                self.assertEqual(duration, 250)
                self.assertEqual(sizes, {"target_size": 6, "compiled_size": 15})
                kwargs = wrapper.return_value.diff.call_args.kwargs
                self.assertEqual(kwargs["target_elf"], b"target")
                self.assertEqual(kwargs["compiled_elf"], b"compiled object")


class DiffMetricsTests(AsyncHTTPTestCase):
    def get_app(self):
        executor = ThreadPoolExecutor(max_workers=1)
        self.addCleanup(executor.shutdown)
        return tornado.web.Application(
            [(r"/diff", DiffHandler, {"config": make_config(), "executor": executor})]
        )

    def setUp(self):
        super().setUp()
        self.metrics = Mock()
        patcher = patch("cromper.handlers.metrics.metrics", self.metrics)
        patcher.start()
        self.addCleanup(patcher.stop)

    def request_diff(self, body):
        return self.fetch(
            "/diff",
            method="POST",
            body=body,
            headers={"Content-Type": "application/json"},
        )

    def test_metrics_and_http_payload_for_success_and_diff_failure(self):
        for failure in (False, True):
            self.metrics.reset_mock()
            with patch("cromper.handlers.diff.DiffWrapper") as wrapper:
                if failure:
                    wrapper.return_value.diff.side_effect = ValueError("diff failed")
                    expected = {"success": False, "error": "diff failed"}
                else:
                    wrapper.return_value.diff.return_value = SimpleNamespace(
                        result={"score": 0}, errors=""
                    )
                    expected = {"success": True, "result": {"score": 0}, "errors": ""}
                response = self.request_diff(json.dumps(diff_data()))
            self.assertEqual(response.code, 200)
            self.assertEqual(json.loads(response.body), expected)
            attrs = {
                "platform": "n64",
                "outcome": "diff_error" if failure else "success",
                "target_size": 6,
                "compiled_size": 15,
            }
            self.metrics.count.assert_called_once_with(
                "cromper.diff.requests", 1, attributes=attrs
            )
            calls = {
                call.args[0]: call for call in self.metrics.distribution.call_args_list
            }
            self.assertEqual(
                set(calls),
                {
                    "cromper.diff.request_duration",
                    "cromper.diff.duration",
                    "cromper.diff.target_size",
                    "cromper.diff.compiled_size",
                },
            )
            for name, call in calls.items():
                self.assertEqual(call.kwargs["attributes"], attrs)
                if name.endswith("size"):
                    self.assertEqual(call.kwargs["unit"], "byte")
                    self.assertEqual(
                        call.args[1], 6 if name.endswith("target_size") else 15
                    )
                else:
                    self.assertEqual(call.kwargs["unit"], "millisecond")
                    self.assertGreaterEqual(call.args[1], 0)

    def test_invalid_requests_are_counted_without_execution_metrics(self):
        bad_base64 = diff_data()
        bad_base64["target_elf"] = "a"
        for body in (
            "invalid json",
            "{}",
            json.dumps({"platform_id": "user-provided"}),
            json.dumps({"platform_id": "n64"}),
            json.dumps(bad_base64),
        ):
            self.metrics.reset_mock()
            response = self.request_diff(body)
            self.assertEqual(response.code, 400)
            attrs = self.metrics.count.call_args.kwargs["attributes"]
            self.assertEqual(attrs["outcome"], "invalid_request")
            self.assertIn(attrs["platform"], ("unknown", "n64"))
            self.assertEqual(
                [call.args[0] for call in self.metrics.distribution.call_args_list],
                ["cromper.diff.request_duration"],
            )

    def test_worker_failure_is_counted(self):
        with patch(
            "cromper.handlers.diff.generate_diff",
            side_effect=RuntimeError("worker failed"),
        ):
            response = self.request_diff(json.dumps(diff_data()))
        self.assertEqual(response.code, 500)
        self.assertEqual(
            self.metrics.count.call_args.kwargs["attributes"]["outcome"],
            "internal_error",
        )
