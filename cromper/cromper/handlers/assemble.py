import base64
import time
from typing import Any

import tornado.web

from ..config import CromperConfig
from ..error import AssemblyError
from ..wrappers.compiler_wrapper import AssemblyData, CompilerWrapper
from .handlers import BaseHandler
from .metrics import OperationResult, record_operation_metrics


def assemble_asm(data: dict[str, Any], config: CromperConfig) -> OperationResult:
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

        response = {
            "success": True,
            "hash": result.hash,
            "arch": result.arch,
            "elf_object": elf_object_b64,
        }

    except AssemblyError as e:
        duration_ms = (time.perf_counter() - started) * 1000
        response = {"success": False, "error": str(e)}

    attributes: dict[str, str | int] = {
        "platform": platform.id,
        "outcome": "success" if response["success"] else "assembly_error",
    }
    sizes: dict[str, tuple[int, str | None]] = {}
    if isinstance(asm_data, str):
        input_size = len(asm_data)
        attributes["input_size"] = input_size
        sizes["input_size"] = (input_size, None)
    return OperationResult(response, duration_ms, attributes, sizes)


class AssembleHandler(BaseHandler):
    async def post(self) -> None:
        started = time.perf_counter()
        data = self.get_json_body()
        ioloop = tornado.ioloop.IOLoop.current()
        result = await ioloop.run_in_executor(
            self.executor, assemble_asm, data, self.config
        )
        self.write(result.response)
        record_operation_metrics(
            "assemble",
            attributes=result.attributes,
            request_duration_ms=(time.perf_counter() - started) * 1000,
            duration_ms=result.duration_ms,
            sizes=result.sizes,
        )
