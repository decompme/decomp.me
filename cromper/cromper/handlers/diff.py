import asyncio
import base64
import logging
import time
from dataclasses import dataclass
from typing import Any

import tornado.web

from ..config import CromperConfig
from ..error import DiffError
from ..wrappers.diff_wrapper import DiffWrapper
from .diff_cache import TargetDumpCache, target_dump_cache_key
from .handlers import BaseHandler
from .metrics import OperationResult, record_operation_metrics

logger = logging.getLogger(__name__)


@dataclass
class DiffRequest:
    platform_id: str
    target_elf: bytes
    compiled_elf: bytes
    diff_label: str
    diff_flags: list[Any]


@dataclass
class DumpResult:
    dump: str | None = None
    error: str | None = None


def prepare_diff_request(data: dict[str, Any], config: CromperConfig) -> DiffRequest:
    platform_id = data.get("platform_id")
    if not platform_id:
        raise tornado.web.HTTPError(400, "platform_id is required")
    try:
        config.platforms_instance.from_id(platform_id)
    except ValueError as e:
        raise tornado.web.HTTPError(400, "invalid platform_id") from e

    target_elf = data.get("target_elf")
    compiled_elf = data.get("compiled_elf")
    if target_elf is None or compiled_elf is None:
        raise tornado.web.HTTPError(400, "target_elf and compiled_elf are required")
    try:
        target_elf = base64.b64decode(target_elf)
    except Exception as e:
        raise tornado.web.HTTPError(400, f"Invalid base64 target_elf: {e}") from e
    try:
        compiled_elf = base64.b64decode(compiled_elf)
    except Exception as e:
        raise tornado.web.HTTPError(400, f"Invalid base64 compiled_elf: {e}") from e

    return DiffRequest(
        platform_id=platform_id,
        target_elf=target_elf,
        compiled_elf=compiled_elf,
        diff_label=data.get("diff_label", ""),
        diff_flags=data.get("diff_flags", []),
    )


def generate_dump(
    elf_object: bytes,
    platform_id: str,
    diff_label: str,
    diff_flags: list[Any],
    config: CromperConfig,
) -> DumpResult:
    """Generate one object's normalized assembly dump in a process worker."""
    try:
        platform = config.platforms_instance.from_id(platform_id)
        dump = DiffWrapper(config).get_dump_for_diff(
            elf_object, platform, diff_label, diff_flags
        )
        return DumpResult(dump=dump)
    except Exception as e:
        logger.exception("Error generating diff dump")
        return DumpResult(error=str(e))


def generate_diff(
    request: DiffRequest,
    config: CromperConfig,
    target_dump: DumpResult,
    compiled_dump: DumpResult | None,
) -> OperationResult:
    """Synchronous diff generation that runs in process pool."""
    platform = config.platforms_instance.from_id(request.platform_id)
    wrapper = DiffWrapper(config)
    sizes = {
        "target_size": len(request.target_elf),
        "compiled_size": len(request.compiled_elf),
    }
    started = time.perf_counter()
    try:
        if target_dump.error is not None:
            raise DiffError(f"Error dumping target assembly: {target_dump.error}")
        if target_dump.dump is None:
            raise DiffError("Target assembly dump was not provided")
        if compiled_dump is None:
            mydump = ""
            compiled_errors = []
        elif compiled_dump.error is not None:
            mydump = ""
            compiled_errors = [
                f"Warning: Error dumping compiled assembly: {compiled_dump.error}"
            ]
        else:
            mydump = compiled_dump.dump or ""
            compiled_errors = []
        result = wrapper.diff_from_dumps(
            target_dump.dump,
            mydump,
            platform,
            request.diff_flags,
            compiled_dump_errors=compiled_errors,
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
        request = prepare_diff_request(data, self.config)
        operation_started = time.perf_counter()
        cache: TargetDumpCache | None = self.settings.get("target_dump_cache")
        ioloop = tornado.ioloop.IOLoop.current()
        target_key = target_dump_cache_key(
            platform_id=request.platform_id,
            elf_object=request.target_elf,
            diff_label=request.diff_label,
            diff_flags=request.diff_flags,
        )
        cached_target_dump = cache.get(target_key) if cache is not None else None
        target_dump = (
            DumpResult(dump=cached_target_dump)
            if cached_target_dump is not None
            else None
        )
        compiled_uses_target = request.compiled_elf == request.target_elf
        compiled_dump = target_dump if compiled_uses_target else None

        dump_futures = {}
        if target_dump is None:
            dump_futures["target"] = ioloop.run_in_executor(
                self.executor,
                generate_dump,
                request.target_elf,
                request.platform_id,
                request.diff_label,
                request.diff_flags,
                self.config,
            )
        if request.compiled_elf and compiled_dump is None:
            dump_futures["compiled"] = ioloop.run_in_executor(
                self.executor,
                generate_dump,
                request.compiled_elf,
                request.platform_id,
                request.diff_label,
                request.diff_flags,
                self.config,
            )
        generated_dumps = dict(
            zip(dump_futures, await asyncio.gather(*dump_futures.values()))
        )
        if target_dump is None:
            target_dump = generated_dumps["target"]
            if cache is not None and target_dump.dump is not None:
                cache.put(target_key, target_dump.dump)
        if request.compiled_elf and compiled_uses_target:
            compiled_dump = target_dump
        elif request.compiled_elf and compiled_dump is None:
            compiled_dump = generated_dumps["compiled"]

        assert target_dump is not None
        if cache is None:
            cache_status = "disabled"
        else:
            cache_status = "hit" if cached_target_dump is not None else "miss"
        result = await ioloop.run_in_executor(
            self.executor,
            generate_diff,
            request,
            self.config,
            target_dump,
            compiled_dump,
        )
        self.write(result.response)
        record_operation_metrics(
            "diff",
            attributes={**result.attributes, "cache_status": cache_status},
            request_duration_ms=(time.perf_counter() - started) * 1000,
            duration_ms=(time.perf_counter() - operation_started) * 1000,
            sizes=result.sizes,
        )
