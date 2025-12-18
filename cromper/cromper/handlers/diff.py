import base64

from typing import Any, Dict

import tornado.web

from .handlers import BaseHandler
from ..config import CromperConfig
from ..wrappers.diff_wrapper import DiffWrapper


def generate_diff(data: Dict[str, Any], config: CromperConfig) -> Dict[str, Any]:
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

    # Create assembly data object

    wrapper = DiffWrapper(
        objdump_timeout_seconds=config.objdump_timeout_seconds,
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
            self.executor, generate_diff, data, self.config
        )
        self.write(result)
