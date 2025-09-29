from typing import Any, Dict

import tornado

from .handlers import BaseHandler
from ..wrappers.decompiler_wrapper import DecompilerWrapper

from cromper import platforms


def decompile(data: Dict[str, Any], settings) -> Dict[str, Any]:
    """Synchronous decompilation that runs in process pool."""
    platform_id = data.get("platform_id")
    compiler_id = data.get("compiler_id")
    if not platform_id or not compiler_id:
        raise tornado.web.HTTPError(400, "platform_id and compiler_id are required")

    try:
        platform = platforms.from_id(platform_id)
        compiler = settings["compilers_instance"].from_id(compiler_id)
    except ValueError:
        raise tornado.web.HTTPError(400, "invalid platform_id or compiler_id")

    default_source_code = data.get("default_source_code", "")
    asm = data.get("asm", "")
    context = data.get("context", "")

    if not asm:
        raise tornado.web.HTTPError(400, "asm is required")

    config = settings["config"]

    wrapper = DecompilerWrapper(
        use_jail=config.use_sandbox_jail,
        sandbox_tmp_path=config.sandbox_tmp_path,
        sandbox_chroot_path=config.sandbox_chroot_path,
        compiler_base_path=config.compiler_base_path,
        library_base_path=config.library_base_path,
        wineprefix=config.wineprefix,
        nsjail_bin_path=config.nsjail_bin_path,
        sandbox_disable_proc=config.sandbox_disable_proc,
        debug=config.debug,
    )

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
            self.executor, decompile, data, self.application.settings
        )
        self.write(result)
