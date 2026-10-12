import base64
import json
from concurrent.futures import Future
from unittest.mock import patch

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from cromper.config import CromperConfig
from cromper.handlers.diff import DiffHandler, DumpResult
from cromper.handlers.diff_cache import TargetDumpCache
from cromper.handlers.metrics import OperationResult


class InlineExecutor:
    def submit(self, function, *args):
        future = Future()
        try:
            future.set_result(function(*args))
        except Exception as error:
            future.set_exception(error)
        return future


class DiffHandlerDumpCacheTests(AsyncHTTPTestCase):
    def get_app(self):
        options = {"config": CromperConfig(), "executor": InlineExecutor()}
        return tornado.web.Application(
            [(r"/diff", DiffHandler, options)],
            target_dump_cache=TargetDumpCache(),
        )

    def post_diff(self, compiled_object):
        return self.fetch(
            "/diff",
            method="POST",
            body=json.dumps(
                {
                    "platform_id": "n64",
                    "target_elf": base64.b64encode(b"target").decode(),
                    "compiled_elf": base64.b64encode(compiled_object).decode(),
                    "diff_label": "func",
                    "diff_flags": [],
                }
            ),
            headers={"Content-Type": "application/json"},
        )

    def test_target_dump_is_reused_across_compilations(self):
        dump_result = DumpResult(dump="normalized dump")
        diff_result = OperationResult(
            response={"success": True, "result": {}, "errors": ""},
            duration_ms=1,
            attributes={"platform": "n64", "outcome": "success"},
            sizes={},
        )
        with (
            patch(
                "cromper.handlers.diff.generate_dump", return_value=dump_result
            ) as generate_dump_fn,
            patch("cromper.handlers.diff.generate_diff", return_value=diff_result),
            patch("cromper.handlers.diff.record_operation_metrics") as metrics,
        ):
            responses = [
                self.post_diff(b"compiled-a"),
                self.post_diff(b"compiled-b"),
                self.post_diff(b"compiled-b"),
            ]

        self.assertTrue(all(response.code == 200 for response in responses))
        self.assertEqual(generate_dump_fn.call_count, 4)
        self.assertEqual(
            [call.args[0] for call in generate_dump_fn.call_args_list],
            [b"target", b"compiled-a", b"compiled-b", b"compiled-b"],
        )
        self.assertEqual(
            [
                call.kwargs["attributes"]["cache_status"]
                for call in metrics.call_args_list
            ],
            ["miss", "hit", "hit"],
        )
