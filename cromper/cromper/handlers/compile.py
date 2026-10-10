import base64
import time
from typing import Any

import tornado.web

from ..config import CromperConfig
from ..error import CompilationError
from ..libraries import Library
from ..wrappers.compiler_wrapper import CompilerWrapper
from .handlers import BaseHandler
from .metrics import OperationResult, record_operation_metrics


def compile(data: dict[str, Any], config: CromperConfig) -> OperationResult:
    """Synchronous compilation that runs in process pool."""
    compiler_id = data.get("compiler_id")
    if not compiler_id:
        raise tornado.web.HTTPError(400, "compiler_id is required")

    try:
        compiler = config.compilers_instance.from_id(compiler_id)
    except ValueError:
        raise tornado.web.HTTPError(400, "invalid compiler_id")

    code = data.get("code", "")
    context = data.get("context", "")
    function = data.get("function", "")
    compiler_flags = data.get("compiler_flags", "")
    try:
        libraries = [Library(**lib) for lib in data.get("libraries", [])]
    except (TypeError, ValueError) as e:
        raise tornado.web.HTTPError(400, f"invalid libraries: {e}") from e

    wrapper = CompilerWrapper(config)

    started = time.perf_counter()
    try:
        result = wrapper.compile_code(
            compiler=compiler,
            compiler_flags=compiler_flags,
            code=code,
            context=context,
            function=function,
            libraries=libraries,
        )

        duration_ms = (time.perf_counter() - started) * 1000
        elf_object_b64 = base64.b64encode(result.elf_object).decode("utf-8")

        response = {
            "success": True,
            "elf_object": elf_object_b64,
            "errors": result.errors,
        }

    except CompilationError as e:
        duration_ms = (time.perf_counter() - started) * 1000
        response = {"success": False, "error": str(e)}

    attributes: dict[str, str | int] = {
        "platform": compiler.platform.id,
        "compiler_id": compiler.id,
        "outcome": "success" if response["success"] else "compilation_error",
    }
    sizes: dict[str, tuple[int, str | None]] = {}
    if isinstance(code, str) and isinstance(context, str):
        input_size = len(code) + len(context)
        attributes["input_size"] = input_size
        sizes["input_size"] = (input_size, None)
    return OperationResult(response, duration_ms, attributes, sizes)


class CompileHandler(BaseHandler):
    async def post(self) -> None:
        started = time.perf_counter()
        data = self.get_json_body()
        ioloop = tornado.ioloop.IOLoop.current()
        result = await ioloop.run_in_executor(self.executor, compile, data, self.config)
        self.write(result.response)
        record_operation_metrics(
            "compile",
            attributes=result.attributes,
            request_duration_ms=(time.perf_counter() - started) * 1000,
            duration_ms=result.duration_ms,
            sizes=result.sizes,
        )
