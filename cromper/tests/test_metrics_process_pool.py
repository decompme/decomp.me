import json
from concurrent.futures import ProcessPoolExecutor
from unittest.mock import Mock, patch

import tornado.web
from tornado.testing import AsyncHTTPTestCase

from cromper.compilers import GCC281PM
from cromper.config import CromperConfig
from cromper.handlers.assemble import AssembleHandler
from cromper.handlers.compile import CompileHandler
from cromper.handlers.decompile import DecompileHandler
from cromper.handlers.diff import DiffHandler

from .common import requiresCompiler


class MetricsProcessPoolTests(AsyncHTTPTestCase):
    def get_app(self):
        executor = ProcessPoolExecutor(max_workers=1)
        self.addCleanup(executor.shutdown)
        options = {"config": CromperConfig(), "executor": executor}
        return tornado.web.Application(
            [
                (r"/compile", CompileHandler, options),
                (r"/assemble", AssembleHandler, options),
                (r"/diff", DiffHandler, options),
                (r"/decompile", DecompileHandler, options),
            ]
        )

    def request_operation(self, operation, data):
        response = self.fetch(
            f"/{operation}",
            method="POST",
            body=json.dumps(data),
            headers={"Content-Type": "application/json"},
            request_timeout=30,
        )
        self.assertEqual(response.code, 200, response.body)
        result = json.loads(response.body)
        self.assertTrue(result["success"], result)
        return result

    @requiresCompiler(GCC281PM)
    def test_real_workers_preserve_responses_and_publish_metrics_in_parent(self):
        metrics = Mock()
        with patch("cromper.handlers.metrics.metrics", metrics):
            compiled = self.request_operation(
                "compile",
                {
                    "compiler_id": GCC281PM.id,
                    "compiler_flags": "-mips2 -O2",
                    "code": "int return_2(void) { return 2; }",
                    "context": "",
                },
            )
            self.request_operation(
                "diff",
                {
                    "platform_id": "n64",
                    "target_elf": compiled["elf_object"],
                    "compiled_elf": compiled["elf_object"],
                },
            )
            asm = "glabel return_2\njr $ra\nli $v0,2"
            self.request_operation("assemble", {"platform_id": "n64", "asm_data": asm})
            self.request_operation(
                "decompile",
                {
                    "platform_id": "n64",
                    "compiler_id": GCC281PM.id,
                    "asm": asm,
                    "context": "",
                },
            )
        self.assertEqual(
            {call.args[0] for call in metrics.count.call_args_list},
            {
                f"cromper.{operation}.requests"
                for operation in ("compile", "diff", "assemble", "decompile")
            },
        )
        durations = [
            call
            for call in metrics.distribution.call_args_list
            if call.args[0].endswith(".duration")
        ]
        self.assertEqual(len(durations), 4)
        for call in durations:
            self.assertGreater(call.args[1], 0)
            self.assertEqual(call.kwargs["attributes"]["platform"], "n64")
            self.assertEqual(call.kwargs["attributes"]["outcome"], "success")
