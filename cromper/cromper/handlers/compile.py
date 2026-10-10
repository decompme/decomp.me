import base64
import time
from typing import Any

import tornado.web

from ..config import CromperConfig
from ..error import CompilationError
from ..libraries import Library
from ..wrappers.compiler_wrapper import CompilerWrapper
from .handlers import BaseHandler
from .metrics import record_operation_metrics


def compile(
    data: dict[str, Any], config: CromperConfig
) -> tuple[dict[str, Any], float]:
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

        return {
            "success": True,
            "elf_object": elf_object_b64,
            "errors": result.errors,
        }, duration_ms

    except CompilationError as e:
        return {"success": False, "error": str(e)}, (
            time.perf_counter() - started
        ) * 1000


class CompileHandler(BaseHandler):
    """Compilation endpoint."""

    async def post(self) -> None:
        """Handle compilation request."""
        started = time.perf_counter()
        attributes: dict[str, str | int] = {
            "platform": "unknown",
            "compiler_id": "unknown",
            "outcome": "internal_error",
        }
        duration_ms: float | None = None
        input_size: int | None = None
        try:
            data = self.get_json_body()
            compiler_id = data.get("compiler_id")
            if isinstance(compiler_id, str) and compiler_id:
                try:
                    compiler = self.config.compilers_instance.from_id(compiler_id)
                except ValueError:
                    pass
                else:
                    attributes["compiler_id"] = compiler.id
                    attributes["platform"] = compiler.platform.id
            code = data.get("code", "")
            context = data.get("context", "")
            if isinstance(code, str) and isinstance(context, str):
                input_size = len(code) + len(context)
                attributes["input_size"] = input_size
            ioloop = tornado.ioloop.IOLoop.current()
            result, duration_ms = await ioloop.run_in_executor(
                self.executor, compile, data, self.config
            )
            attributes["outcome"] = (
                "success" if result["success"] else "compilation_error"
            )
            self.write(result)
        except tornado.web.HTTPError as e:
            attributes["outcome"] = (
                "invalid_request" if 400 <= e.status_code < 500 else "internal_error"
            )
            raise
        finally:
            request_duration_ms = (time.perf_counter() - started) * 1000
            record_operation_metrics(
                "compile",
                sample_rate=self.config.sentry_metrics_sample_rate,
                attributes=attributes,
                request_duration_ms=request_duration_ms,
                duration_ms=duration_ms,
                sizes={"input_size": (input_size, None)}
                if input_size is not None
                else {},
            )
