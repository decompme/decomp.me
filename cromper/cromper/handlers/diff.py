import base64
import time
from typing import Any

import tornado.web

from ..config import CromperConfig
from ..wrappers.diff_wrapper import DiffWrapper
from .handlers import BaseHandler
from .metrics import record_operation_metrics


def generate_diff(
    data: dict[str, Any], config: CromperConfig
) -> tuple[dict[str, Any], float, dict[str, int]]:
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
    return response, (time.perf_counter() - started) * 1000, sizes


class DiffHandler(BaseHandler):
    """Diff generation endpoint."""

    async def post(self) -> None:
        """Handle diff request."""
        started = time.perf_counter()
        attributes: dict[str, str | int] = {
            "platform": "unknown",
            "outcome": "internal_error",
        }
        duration_ms: float | None = None
        sizes: dict[str, int] = {}
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
            ioloop = tornado.ioloop.IOLoop.current()
            result, duration_ms, sizes = await ioloop.run_in_executor(
                self.executor, generate_diff, data, self.config
            )
            attributes.update(sizes)
            attributes["outcome"] = "success" if result["success"] else "diff_error"
            self.write(result)
        except tornado.web.HTTPError as e:
            attributes["outcome"] = (
                "invalid_request" if 400 <= e.status_code < 500 else "internal_error"
            )
            raise
        finally:
            request_duration_ms = (time.perf_counter() - started) * 1000
            record_operation_metrics(
                "diff",
                attributes=attributes,
                request_duration_ms=request_duration_ms,
                duration_ms=duration_ms,
                sizes={name: (size, "byte") for name, size in sizes.items()},
            )
