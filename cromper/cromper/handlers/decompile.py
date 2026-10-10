import time
from typing import Any

import tornado

from ..config import CromperConfig
from ..wrappers.decompiler_wrapper import DecompilerWrapper
from .handlers import BaseHandler
from .metrics import record_operation_metrics


def decompile(
    data: dict[str, Any], config: CromperConfig
) -> tuple[dict[str, Any], float]:
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
    return response, (time.perf_counter() - started) * 1000


class DecompileHandler(BaseHandler):
    """Decompilation endpoint."""

    async def post(self) -> None:
        """Handle decompile request."""
        started = time.perf_counter()
        attributes: dict[str, str | int] = {
            "platform": "unknown",
            "compiler_id": "unknown",
            "outcome": "internal_error",
        }
        duration_ms: float | None = None
        sizes: dict[str, tuple[int, str | None]] = {}
        try:
            data = self.get_json_body()
            platform_id = data.get("platform_id")
            if isinstance(platform_id, str) and platform_id:
                try:
                    platform = self.config.platforms_instance.from_id(platform_id)
                except ValueError:
                    pass
                else:
                    attributes["platform"] = platform.id
            compiler_id = data.get("compiler_id")
            if isinstance(compiler_id, str) and compiler_id:
                try:
                    compiler = self.config.compilers_instance.from_id(compiler_id)
                except ValueError:
                    pass
                else:
                    attributes["compiler_id"] = compiler.id
            for field in ("context", "asm"):
                value = data.get(field, "")
                if isinstance(value, str):
                    name = f"{field}_size"
                    attributes[name] = len(value)
                    sizes[name] = (len(value), None)
            ioloop = tornado.ioloop.IOLoop.current()
            result, duration_ms = await ioloop.run_in_executor(
                self.executor, decompile, data, self.config
            )
            attributes["outcome"] = (
                "success" if result["success"] else "decompilation_error"
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
                "decompile",
                attributes=attributes,
                request_duration_ms=request_duration_ms,
                duration_ms=duration_ms,
                sizes=sizes,
            )
