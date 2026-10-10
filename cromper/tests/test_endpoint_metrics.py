import base64
import json
from concurrent.futures import ThreadPoolExecutor
from threading import current_thread, main_thread
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest
import tornado.web
from tornado.testing import AsyncHTTPTestCase

from cromper.error import AssemblyError, CompilationError
from cromper.handlers.assemble import AssembleHandler, assemble_asm
from cromper.handlers.compile import CompileHandler, compile
from cromper.handlers.decompile import DecompileHandler, decompile
from cromper.handlers.diff import DiffHandler, generate_diff
from cromper.wrappers.compiler_wrapper import AssemblyResult, CompilationResult

OPERATIONS = {
    "compile": (
        CompileHandler,
        compile,
        "CompilerWrapper",
        "compile_code",
        CompilationError,
    ),
    "assemble": (
        AssembleHandler,
        assemble_asm,
        "CompilerWrapper",
        "assemble_asm",
        AssemblyError,
    ),
    "diff": (DiffHandler, generate_diff, "DiffWrapper", "diff", ValueError),
    "decompile": (
        DecompileHandler,
        decompile,
        "DecompilerWrapper",
        "decompile",
        ValueError,
    ),
}


def make_config():
    platform = SimpleNamespace(id="n64")
    compiler = SimpleNamespace(id="test-cc", platform=platform)
    config = SimpleNamespace(platforms_instance=Mock(), compilers_instance=Mock())

    def resolve(value, expected):
        if value != expected.id:
            raise ValueError("Unknown identifier")
        return expected

    config.platforms_instance.from_id.side_effect = lambda value: resolve(
        value, platform
    )
    config.compilers_instance.from_id.side_effect = lambda value: resolve(
        value, compiler
    )
    return config


def request_data():
    return {
        "platform_id": "n64",
        "compiler_id": "test-cc",
        "code": "éabc",
        "context": "xy",
        "asm_data": "éabc",
        "asm": "nop",
        "target_elf": base64.b64encode(b"target").decode(),
        "compiled_elf": base64.b64encode(b"compiled object").decode(),
    }


def tool_result(operation):
    return {
        "compile": CompilationResult(b"elf", ""),
        "assemble": AssemblyResult("asm-hash", "mips", b"elf"),
        "diff": SimpleNamespace(result={"score": 0}, errors=""),
        "decompile": "int foo() {}",
    }[operation]


def expected_response(operation):
    return {
        "compile": {"success": True, "elf_object": "ZWxm", "errors": ""},
        "assemble": {
            "success": True,
            "hash": "asm-hash",
            "arch": "mips",
            "elf_object": "ZWxm",
        },
        "diff": {"success": True, "result": {"score": 0}, "errors": ""},
        "decompile": {"success": True, "decompiled_code": "int foo() {}"},
    }[operation]


def expected_sizes(operation):
    return {
        "compile": {"input_size": (6, None)},
        "assemble": {"input_size": (4, None)},
        "diff": {"target_size": (6, "byte"), "compiled_size": (15, "byte")},
        "decompile": {"context_size": (2, None), "asm_size": (3, None)},
    }[operation]


@pytest.mark.parametrize("operation", OPERATIONS)
@pytest.mark.parametrize("failure", [False, True])
def test_workers_return_payload_timing_and_metadata(operation, failure):
    _, worker, wrapper_name, method, error = OPERATIONS[operation]
    config = make_config()
    with (
        patch(f"cromper.handlers.{operation}.{wrapper_name}") as wrapper,
        patch(
            f"cromper.handlers.{operation}.time.perf_counter", side_effect=[10, 10.25]
        ),
    ):
        tool = getattr(wrapper.return_value, method)
        if failure:
            tool.side_effect = error("tool failed")
        else:
            tool.return_value = tool_result(operation)
        result = worker(request_data(), config)
    assert result.response == (
        {"success": False, "error": "tool failed"}
        if failure
        else expected_response(operation)
    )
    assert result.duration_ms == 250
    assert result.sizes == expected_sizes(operation)
    assert result.attributes["platform"] == "n64"
    if operation in ("compile", "decompile"):
        assert result.attributes["compiler_id"] == "test-cc"
    for name, (size, _) in result.sizes.items():
        assert result.attributes[name] == size
    assert result.attributes["outcome"] == (
        {
            "compile": "compilation_error",
            "assemble": "assembly_error",
            "diff": "diff_error",
            "decompile": "decompilation_error",
        }[operation]
        if failure
        else "success"
    )
    assert config.platforms_instance.from_id.call_count == (
        0 if operation == "compile" else 1
    )
    assert config.compilers_instance.from_id.call_count == (
        1 if operation in ("compile", "decompile") else 0
    )


class EndpointMetricsTests(AsyncHTTPTestCase):
    def get_app(self):
        executor = ThreadPoolExecutor(max_workers=1)
        self.addCleanup(executor.shutdown)
        self.config = make_config()
        return tornado.web.Application(
            [
                (
                    f"/{operation}",
                    handler,
                    {"config": self.config, "executor": executor},
                )
                for operation, (handler, *_) in OPERATIONS.items()
            ]
        )

    def request_operation(self, operation, body):
        return self.fetch(
            f"/{operation}",
            method="POST",
            body=body,
            headers={"Content-Type": "application/json"},
        )

    def test_metadata_is_collected_in_worker_and_metrics_emitted_in_main_thread(self):
        for operation, (_, _, wrapper_name, method, _) in OPERATIONS.items():
            with (
                self.subTest(operation=operation),
                patch(f"cromper.handlers.{operation}.{wrapper_name}") as wrapper,
                patch("cromper.handlers.metrics.metrics") as metrics,
            ):

                def run_tool(operation=operation, **kwargs):
                    self.assertIsNot(current_thread(), main_thread())
                    return tool_result(operation)

                getattr(wrapper.return_value, method).side_effect = run_tool
                response = self.request_operation(operation, json.dumps(request_data()))
                self.assertEqual(response.code, 200)
                self.assertEqual(
                    json.loads(response.body), expected_response(operation)
                )
                attrs = metrics.count.call_args.kwargs["attributes"]
                self.assertEqual(attrs["outcome"], "success")
                metrics.count.assert_called_once_with(
                    f"cromper.{operation}.requests", 1, attributes=attrs
                )
                calls = {
                    call.args[0]: call for call in metrics.distribution.call_args_list
                }
                sizes = expected_sizes(operation)
                self.assertEqual(
                    set(calls),
                    {
                        f"cromper.{operation}.{name}"
                        for name in ("request_duration", "duration", *sizes)
                    },
                )
                for name, (size, unit) in sizes.items():
                    call = calls[f"cromper.{operation}.{name}"]
                    self.assertEqual(call.args[1], size)
                    self.assertEqual(call.kwargs["unit"], unit)
                for name in ("request_duration", "duration"):
                    call = calls[f"cromper.{operation}.{name}"]
                    self.assertGreaterEqual(call.args[1], 0)
                    self.assertEqual(call.kwargs["unit"], "millisecond")

    def test_invalid_requests_preserve_errors_without_metrics(self):
        for operation in OPERATIONS:
            for body in (
                "invalid json",
                "{}",
                json.dumps(
                    {
                        **request_data(),
                        "platform_id": "unknown",
                        "compiler_id": "unknown",
                    }
                ),
            ):
                with (
                    self.subTest(operation=operation, body=body),
                    patch("cromper.handlers.metrics.metrics") as metrics,
                ):
                    response = self.request_operation(operation, body)
                    self.assertEqual(response.code, 400)
                    metrics.count.assert_not_called()
                    metrics.distribution.assert_not_called()
        with patch("cromper.handlers.metrics.metrics") as metrics:
            response = self.request_operation(
                "diff", json.dumps({**request_data(), "target_elf": "a"})
            )
            self.assertEqual(response.code, 400)
            metrics.count.assert_not_called()

    def test_unexpected_worker_errors_preserve_500_without_metrics(self):
        for operation, (_, worker, *_) in OPERATIONS.items():
            with (
                self.subTest(operation=operation),
                patch(
                    f"cromper.handlers.{operation}.{worker.__name__}",
                    side_effect=RuntimeError("worker failed"),
                ),
                patch("cromper.handlers.metrics.metrics") as metrics,
            ):
                response = self.request_operation(operation, json.dumps(request_data()))
                self.assertEqual(response.code, 500)
                metrics.count.assert_not_called()
                metrics.distribution.assert_not_called()
