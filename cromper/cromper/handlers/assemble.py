import base64
import time
from typing import Any

import tornado.web

from ..config import CromperConfig
from ..error import AssemblyError
from ..wrappers.compiler_wrapper import AssemblyData, CompilerWrapper
from .handlers import BaseHandler
from .metrics import record_operation_metrics


def assemble_asm(
    data: dict[str, Any], config: CromperConfig
) -> tuple[dict[str, Any], float]:
    """Synchronous assembly that runs in process pool."""
    platform_id = data.get("platform_id")
    if not platform_id:
        raise tornado.web.HTTPError(400, "platform_id is required")

    try:
        platform = config.platforms_instance.from_id(platform_id)
    except ValueError:
        raise tornado.web.HTTPError(400, "invalid platform_id")

    asm_data = data.get("asm_data", "")
    asm_hash = data.get("asm_hash", "")

    if not asm_data:
        raise tornado.web.HTTPError(400, "asm_data is required")

    asm = AssemblyData(data=asm_data, hash=asm_hash)

    wrapper = CompilerWrapper(config)

    started = time.perf_counter()
    try:
        result = wrapper.assemble_asm(platform=platform, asm=asm)

        duration_ms = (time.perf_counter() - started) * 1000
        elf_object_b64 = base64.b64encode(result.elf_object).decode("utf-8")

        return {
            "success": True,
            "hash": result.hash,
            "arch": result.arch,
            "elf_object": elf_object_b64,
        }, duration_ms

    except AssemblyError as e:
        return {"success": False, "error": str(e)}, (
            time.perf_counter() - started
        ) * 1000


class AssembleHandler(BaseHandler):
    """Assembly endpoint."""

    async def post(self) -> None:
        """Handle assembly request."""
        started = time.perf_counter()
        attributes: dict[str, str | int] = {
            "platform": "unknown",
            "outcome": "internal_error",
        }
        duration_ms: float | None = None
        input_size: int | None = None
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
            asm_data = data.get("asm_data", "")
            if isinstance(asm_data, str):
                input_size = len(asm_data)
                attributes["input_size"] = input_size
            ioloop = tornado.ioloop.IOLoop.current()
            result, duration_ms = await ioloop.run_in_executor(
                self.executor, assemble_asm, data, self.config
            )
            attributes["outcome"] = "success" if result["success"] else "assembly_error"
            self.write(result)
        except tornado.web.HTTPError as e:
            attributes["outcome"] = (
                "invalid_request" if 400 <= e.status_code < 500 else "internal_error"
            )
            raise
        finally:
            request_duration_ms = (time.perf_counter() - started) * 1000
            record_operation_metrics(
                "assemble",
                attributes=attributes,
                request_duration_ms=request_duration_ms,
                duration_ms=duration_ms,
                sizes={"input_size": (input_size, None)}
                if input_size is not None
                else {},
            )
