from typing import Any

import tornado

from ..config import CromperConfig
from ..wrappers.decompiler_wrapper import DecompilerWrapper
from .handlers import BaseHandler


def decompile(data: dict[str, Any], config: CromperConfig) -> dict[str, Any]:
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

    try:
        result = wrapper.decompile(
            default_source_code=default_source_code,
            platform=platform,
            asm=asm,
            context=context,
            compiler=compiler,
        )

        return {
            "success": True,
            "decompiled_code": result,
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


class DecompileHandler(BaseHandler):
    """Decompilation endpoint."""

    async def post(self):
        """Handle decompile request."""
        data = self.get_json_body()
        ioloop = tornado.ioloop.IOLoop.current()
        result = await ioloop.run_in_executor(
            self.executor, decompile, data, self.config
        )
        self.write(result)
