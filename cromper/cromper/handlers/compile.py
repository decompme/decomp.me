import base64
from typing import Any

import tornado.web

from ..config import CromperConfig
from ..error import CompilationError
from ..libraries import Library
from ..wrappers.compiler_wrapper import CompilerWrapper
from .handlers import BaseHandler


def compile(data: dict[str, Any], config: CromperConfig) -> dict[str, Any]:
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
    function = data.get("function", "")
    compiler_flags = data.get("compiler_flags", "")
    try:
        libraries = [Library(**lib) for lib in data.get("libraries", [])]
    except (TypeError, ValueError) as e:
        raise tornado.web.HTTPError(400, f"invalid libraries: {e}") from e

    wrapper = CompilerWrapper(config)

    try:
        result = wrapper.compile_code(
            compiler=compiler,
            compiler_flags=compiler_flags,
            code=code,
            context=context,
            function=function,
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
