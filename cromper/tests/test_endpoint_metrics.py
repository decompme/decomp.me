import base64
from types import SimpleNamespace
from unittest.mock import Mock, patch

import pytest

from cromper.error import AssemblyError, CompilationError
from cromper.handlers.assemble import assemble_asm
from cromper.handlers.compile import compile
from cromper.handlers.decompile import decompile
from cromper.handlers.diff import generate_diff
from cromper.wrappers.compiler_wrapper import AssemblyResult, CompilationResult


@pytest.mark.parametrize(
    "operation,worker,wrapper_name,method,error,tool_result,sizes,outcome",
    [
        (
            "compile",
            compile,
            "CompilerWrapper",
            "compile_code",
            CompilationError,
            CompilationResult(b"elf", ""),
            {"input_size": (6, None)},
            "compilation_error",
        ),
        (
            "assemble",
            assemble_asm,
            "CompilerWrapper",
            "assemble_asm",
            AssemblyError,
            AssemblyResult("asm-hash", "mips", b"elf"),
            {"input_size": (4, None)},
            "assembly_error",
        ),
        (
            "diff",
            generate_diff,
            "DiffWrapper",
            "diff",
            ValueError,
            SimpleNamespace(result={}, errors=""),
            {"target_size": (6, "byte"), "compiled_size": (15, "byte")},
            "diff_error",
        ),
        (
            "decompile",
            decompile,
            "DecompilerWrapper",
            "decompile",
            ValueError,
            "int foo() {}",
            {"context_size": (2, None), "asm_size": (3, None)},
            "decompilation_error",
        ),
    ],
    ids=["compile", "assemble", "diff", "decompile"],
)
@pytest.mark.parametrize("failure", [False, True], ids=["success", "failure"])
def test_worker_metrics(
    operation, worker, wrapper_name, method, error, tool_result, sizes, outcome, failure
):
    platform = SimpleNamespace(id="n64")
    compiler = SimpleNamespace(id="test-cc", platform=platform)
    config = SimpleNamespace(
        platforms_instance=Mock(from_id=Mock(return_value=platform)),
        compilers_instance=Mock(from_id=Mock(return_value=compiler)),
    )
    data = {
        "platform_id": "n64",
        "compiler_id": "test-cc",
        "code": "éabc",
        "context": "xy",
        "asm_data": "éabc",
        "asm": "nop",
        "target_elf": base64.b64encode(b"target").decode(),
        "compiled_elf": base64.b64encode(b"compiled object").decode(),
    }
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
            tool.return_value = tool_result
        result = worker(data, config)

    assert result.response["success"] is not failure
    if failure:
        assert result.response["error"] == "tool failed"
    assert result.duration_ms == 250
    assert result.sizes == sizes
    expected = {
        "platform": "n64",
        "outcome": outcome if failure else "success",
        **{name: size for name, (size, _) in sizes.items()},
    }
    if operation in ("compile", "decompile"):
        expected["compiler_id"] = "test-cc"
    assert result.attributes == expected
