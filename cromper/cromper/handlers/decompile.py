import time
from typing import Any

import tornado

from ..config import CromperConfig
from ..wrappers.decompiler_wrapper import DecompilerWrapper
from .handlers import BaseHandler
from .metrics import OperationResult, record_operation_metrics


def decompile(data: dict[str, Any], config: CromperConfig) -> OperationResult:
    """Synchronous decompilation that runs in process pool."""
    platform_id = data.get("platform_id")
    compiler_id = data.get("compiler_id")
    if not platform_id or not compiler_id:
        raise tornado.web.HTTPError(400, "platform_id and compiler_id are required")

    try:
        platform = config.platforms_instance.from_id(platform_id)
        compiler = config.compilers_instance.from_id(compiler_id)
    except ValueError:
        raise tornado.web.HTTPError(400, "invalid platform_id or compiler_id")

    default_source_code = data.get("default_source_code", "")
    asm = data.get("asm", "")
    context = data.get("context", "")

    if not asm:
        raise tornado.web.HTTPError(400, "asm is required")

    wrapper = DecompilerWrapper(config)

    started = time.perf_counter()
    try:
        result = wrapper.decompile(
            default_source_code=default_source_code,
            platform=platform,
            asm=asm,
            context=context,
            compiler=compiler,
        )

        response = {
            "success": True,
            "decompiled_code": result,
        }

    except Exception as e:
        response = {"success": False, "error": str(e)}
    duration_ms = (time.perf_counter() - started) * 1000

    attributes: dict[str, str | int] = {
        "platform": platform.id,
        "compiler_id": compiler.id,
        "outcome": "success" if response["success"] else "decompilation_error",
    }
    sizes: dict[str, tuple[int, str | None]] = {}
    for field, value in (("context", context), ("asm", asm)):
        if isinstance(value, str):
            size = len(value)
            name = f"{field}_size"
            attributes[name] = size
            sizes[name] = (size, None)
    return OperationResult(response, duration_ms, attributes, sizes)


class DecompileHandler(BaseHandler):
    async def post(self) -> None:
        started = time.perf_counter()
        data = self.get_json_body()
        ioloop = tornado.ioloop.IOLoop.current()
        result = await ioloop.run_in_executor(
            self.executor, decompile, data, self.config
        )
        self.write(result.response)
        record_operation_metrics(
            "decompile",
            attributes=result.attributes,
            request_duration_ms=(time.perf_counter() - started) * 1000,
            duration_ms=result.duration_ms,
            sizes=result.sizes,
        )
