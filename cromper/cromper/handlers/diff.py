import base64
import time
from typing import Any

import tornado.web

from ..config import CromperConfig
from ..wrappers.diff_wrapper import DiffWrapper
from .handlers import BaseHandler
from .metrics import OperationResult, record_operation_metrics


def generate_diff(data: dict[str, Any], config: CromperConfig) -> OperationResult:
    """Synchronous diff generation that runs in process pool."""
    platform_id = data.get("platform_id")
    if not platform_id:
        raise tornado.web.HTTPError(400, "platform_id is required")

    try:
        platform = config.platforms_instance.from_id(platform_id)
    except ValueError:
        raise tornado.web.HTTPError(400, "invalid platform_id")

    target_elf = data.get("target_elf")
    compiled_elf = data.get("compiled_elf")
    diff_label = data.get("diff_label", "")
    diff_flags = data.get("diff_flags", [])

    if target_elf is None or compiled_elf is None:
        raise tornado.web.HTTPError(400, "target_elf and compiled_elf are required")

    try:
        target_elf = base64.b64decode(target_elf)
    except Exception as e:
        raise tornado.web.HTTPError(400, f"Invalid base64 target_elf: {e}")

    try:
        compiled_elf = base64.b64decode(compiled_elf)
    except Exception as e:
        raise tornado.web.HTTPError(400, f"Invalid base64 compiled_elf: {e}")

    wrapper = DiffWrapper(config)
    sizes = {"target_size": len(target_elf), "compiled_size": len(compiled_elf)}
    started = time.perf_counter()
    try:
        result = wrapper.diff(
            target_elf=target_elf,
            platform=platform,
            diff_label=diff_label,
            compiled_elf=compiled_elf,
            diff_flags=diff_flags,
        )

        response = {
            "success": True,
            "result": result.result,
            "errors": result.errors,
        }

    except Exception as e:
        response = {"success": False, "error": str(e)}
    duration_ms = (time.perf_counter() - started) * 1000

    attributes: dict[str, str | int] = {
        "platform": platform.id,
        "outcome": "success" if response["success"] else "diff_error",
        **sizes,
    }
    return OperationResult(
        response,
        duration_ms,
        attributes,
        {name: (size, "byte") for name, size in sizes.items()},
    )


class DiffHandler(BaseHandler):
    async def post(self) -> None:
        started = time.perf_counter()
        data = self.get_json_body()
        ioloop = tornado.ioloop.IOLoop.current()
        result = await ioloop.run_in_executor(
            self.executor, generate_diff, data, self.config
        )
        self.write(result.response)
        record_operation_metrics(
            "diff",
            attributes=result.attributes,
            request_duration_ms=(time.perf_counter() - started) * 1000,
            duration_ms=result.duration_ms,
            sizes=result.sizes,
        )
