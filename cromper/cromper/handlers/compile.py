import base64

from typing import Any, Dict

import tornado.web

from .handlers import BaseHandler
from ..config import CromperConfig
from ..error import CompilationError
from ..libraries import Library
from ..wrappers.compiler_wrapper import CompilerWrapper


def compile(data: Dict[str, Any], config: CromperConfig) -> Dict[str, Any]:
    """Synchronous compilation that runs in process pool."""
    compiler_id = data.get("compiler_id")
    if not compiler_id:
        raise tornado.web.HTTPError(400, "compiler_id is required")

    try:
        compiler = config.compilers_instance.from_id(compiler_id)
    except ValueError:
        raise tornado.web.HTTPError(400, "invalid compiler_id")

    code = data.get("code", "")
    context = data.get("context", "")
    compiler_flags = data.get("compiler_flags", "")
    libraries = [Library(**lib) for lib in data.get("libraries", [])]

    wrapper = CompilerWrapper(
        use_sandbox_jail=config.use_sandbox_jail,
        compilation_timeout_seconds=config.compilation_timeout_seconds,
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
        result = wrapper.compile_code(
            compiler=compiler,
            compiler_flags=compiler_flags,
            code=code,
            context=context,
            libraries=libraries,
        )

        elf_object_b64 = base64.b64encode(result.elf_object).decode("utf-8")

        return {
            "success": True,
            "elf_object": elf_object_b64,
            "errors": result.errors,
        }

    except CompilationError as e:
        return {"success": False, "error": str(e)}


class CompileHandler(BaseHandler):
    """Compilation endpoint."""

    async def post(self):
        """Handle compilation request."""
        data = self.get_json_body()
        ioloop = tornado.ioloop.IOLoop.current()
        result = await ioloop.run_in_executor(self.executor, compile, data, self.config)
        self.write(result)
