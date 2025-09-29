import base64
from typing import Any, Dict

import tornado.web

from .handlers import BaseHandler
from ..wrappers.diff_wrapper import DiffWrapper

from cromper import platforms


def generate_diff(data: Dict[str, Any], settings) -> Dict[str, Any]:
    """Synchronous diff generation that runs in process pool."""
    platform_id = data.get("platform_id")
    if not platform_id:
        raise tornado.web.HTTPError(400, "platform_id is required")

    try:
        platform = platforms.from_id(platform_id)
    except ValueError:
        raise tornado.web.HTTPError(400, "invalid platform_id")

    target_elf = data.get("target_elf")
    compiled_elf = data.get("compiled_elf")
    diff_label = data.get("diff_label", "")
    diff_flags = data.get("diff_flags", [])

    if not target_elf or not compiled_elf:
        raise tornado.web.HTTPError(400, "target_elf and compiled_elf are required")

    try:
        target_elf = base64.b64decode(target_elf)
    except Exception as e:
        raise tornado.web.HTTPError(400, f"Invalid base64 target_elf: {e}")

    try:
        compiled_elf = base64.b64decode(compiled_elf)
    except Exception as e:
        raise tornado.web.HTTPError(400, f"Invalid base64 compiled_elf: {e}")

    # Create assembly data object

    config = settings["config"]
    wrapper = DiffWrapper(
        objdump_timeout_seconds=10,  # TODO: make configurable
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
        result = wrapper.diff(
            target_elf=target_elf,
            platform=platform,
            diff_label=diff_label,
            compiled_elf=compiled_elf,
            diff_flags=diff_flags,
        )

        return {
            "success": True,
            "result": result.result,
            "errors": result.errors,
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


class DiffHandler(BaseHandler):
    """Diff generation endpoint."""

    async def post(self):
        """Handle diff request."""
        data = self.get_json_body()
        ioloop = tornado.ioloop.IOLoop.current()
        result = await ioloop.run_in_executor(
            self.executor, generate_diff, data, self.application.settings
        )
        self.write(result)
