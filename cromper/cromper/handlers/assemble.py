import base64

from typing import Any, Dict

import tornado.web

from .handlers import BaseHandler
from ..compiler_wrapper import CompilerWrapper, AssemblyData
from ..error import AssemblyError
from cromper import platforms


def assemble_asm(data: Dict[str, Any], settings) -> Dict[str, Any]:
    """Synchronous assembly that runs in process pool."""
    platform_id = data.get("platform_id")
    if not platform_id:
        raise tornado.web.HTTPError(400, "platform_id is required")

    try:
        platform = platforms.from_id(platform_id)
    except ValueError:
        raise tornado.web.HTTPError(400, "invalid platform_id")

    asm_data = data.get("asm_data", "")
    asm_hash = data.get("asm_hash", "")

    if not asm_data:
        raise tornado.web.HTTPError(400, "asm_data is required")

    # Create assembly data object
    asm = AssemblyData(data=asm_data, hash=asm_hash)

    config = settings["config"]
    wrapper = CompilerWrapper(
        use_sandbox_jail=config.use_sandbox_jail,
        assembly_timeout_seconds=config.assembly_timeout_seconds,
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
        result = wrapper.assemble_asm(platform=platform, asm=asm)

        elf_object_b64 = base64.b64encode(result.elf_object).decode("utf-8")

        return {
            "success": True,
            "hash": result.hash,
            "arch": result.arch,
            "elf_object": elf_object_b64,
        }

    except AssemblyError as e:
        return {"success": False, "error": str(e)}


class AssembleHandler(BaseHandler):
    """Assembly endpoint."""

    async def post(self):
        """Handle assembly request."""
        data = self.get_json_body()
        ioloop = tornado.ioloop.IOLoop.current()
        result = await ioloop.run_in_executor(
            self.executor, assemble_asm, data, self.application.settings
        )
        self.write(result)
