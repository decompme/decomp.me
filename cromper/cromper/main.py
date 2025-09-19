#!/usr/bin/env python3

import asyncio
import json
import logging
import os
import traceback
from pathlib import Path
from typing import Any, Dict

# Load environment variables from .env file before importing other modules
from dotenv import load_dotenv

import tornado.web
from tornado.concurrent import run_on_executor
from concurrent.futures import ThreadPoolExecutor


# Import cromper modules after environment is loaded
from cromper.compiler_wrapper import (
    CompilerWrapper,
    AssemblyData,
)
from cromper.error import CompilationError, AssemblyError

from cromper import compilers, platforms, libraries

load_dotenv()


# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class CromperConfig:
    """Configuration for the cromper service."""

    def __init__(self):
        # Server settings
        self.port = int(os.getenv("CROMPER_PORT", "8888"))
        self.debug = os.getenv("CROMPER_DEBUG", "false").lower() == "true"

        # Sandbox settings
        self.use_sandbox_jail = os.getenv("USE_SANDBOX_JAIL", "false").lower() in (
            "true",
            "on",
            "1",
        )
        self.sandbox_disable_proc = os.getenv(
            "SANDBOX_DISABLE_PROC", "false"
        ).lower() in ("true", "on", "1")

        # Paths
        self.compiler_base_path = Path(os.getenv("COMPILER_BASE_PATH", "compilers"))
        self.library_base_path = Path(os.getenv("LIBRARY_BASE_PATH", "/opt/libraries"))
        self.sandbox_tmp_path = Path(os.getenv("SANDBOX_TMP_PATH", "/tmp/sandbox"))
        self.sandbox_chroot_path = Path(
            os.getenv("SANDBOX_CHROOT_PATH", "/tmp/sandbox/root")
        )
        self.wineprefix = Path(os.getenv("WINEPREFIX", "/tmp/wine"))
        self.nsjail_bin_path = Path(os.getenv("SANDBOX_NSJAIL_BIN_PATH", "/bin/nsjail"))

        # Timeouts
        self.compilation_timeout_seconds = int(
            os.getenv("COMPILATION_TIMEOUT_SECONDS", "10")
        )
        self.assembly_timeout_seconds = int(os.getenv("ASSEMBLY_TIMEOUT_SECONDS", "3"))

        # Set up the compiler and library base paths in the shared modules
        self.compilers_instance = compilers.Compilers(self.compiler_base_path)
        libraries.set_library_base_path(self.library_base_path)


class BaseHandler(tornado.web.RequestHandler):
    """Base handler with common functionality."""

    def set_default_headers(self):
        self.set_header("Content-Type", "application/json")
        self.set_header("Access-Control-Allow-Origin", "*")
        self.set_header("Access-Control-Allow-Headers", "Content-Type")
        self.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def options(self):
        """Handle preflight requests."""
        self.set_status(204)
        self.finish()

    def write_error(self, status_code: int, **kwargs):
        """Custom error response."""
        error_message = "Internal server error"
        if "exc_info" in kwargs:
            exc_info = kwargs["exc_info"]
            if exc_info[1]:
                error_message = str(exc_info[1])
                if self.application.settings.get("debug"):
                    # Include traceback in debug mode
                    error_message += "\n" + "".join(
                        traceback.format_exception(*exc_info)
                    )

        self.write({"error": error_message})

    def get_json_body(self) -> Dict[str, Any]:
        """Parse JSON body."""
        try:
            return json.loads(self.request.body)
        except json.JSONDecodeError as e:
            raise tornado.web.HTTPError(400, f"Invalid JSON: {e}")


class HealthHandler(BaseHandler):
    """Health check endpoint."""

    def get(self):
        self.write({"status": "healthy", "service": "cromper"})


class PlatformsHandler(BaseHandler):
    """Platforms information endpoint."""

    def get(self):
        """Get all available platforms."""
        platforms_data = []
        compilers_instance = self.application.settings["compilers_instance"]
        for platform_id, platform in platforms._platforms.items():
            platforms_data.append(
                platform.to_json(
                    compilers=compilers_instance,
                    include_compilers=True,
                    include_presets=False,  # Skip presets for cromper
                    include_num_scratches=False,  # Skip scratches for cromper
                )
            )

        self.write({"platforms": platforms_data})


class CompilersHandler(BaseHandler):
    """Compilers information endpoint."""

    def get(self):
        """Get all available compilers."""
        compilers_data = {
            c.id: c.to_json()
            for c in self.application.settings[
                "compilers_instance"
            ].available_compilers()
        }

        self.write({"compilers": compilers_data})


class LibrariesHandler(BaseHandler):
    """Libraries information endpoint."""

    def get(self):
        """Get all available libraries, optionally filtered by platform."""
        platform = self.get_query_argument("platform", default="")

        if platform:
            libraries_data = [
                {
                    "name": lib.name,
                    "supported_versions": lib.supported_versions,
                    "platform": lib.platform,
                }
                for lib in libraries.libraries_for_platform(platform)
            ]
        else:
            libraries_data = [
                {
                    "name": lib.name,
                    "supported_versions": lib.supported_versions,
                    "platform": lib.platform,
                }
                for lib in libraries.available_libraries()
            ]

        self.write({"libraries": libraries_data})


class CompileHandler(BaseHandler):
    """Compilation endpoint."""

    executor = ThreadPoolExecutor(max_workers=4)

    @run_on_executor
    def compile_code_sync(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Synchronous compilation that runs in thread pool."""
        compiler_id = data.get("compiler_id")
        if not compiler_id:
            raise tornado.web.HTTPError(400, "compiler_id is required")

        try:
            compiler = self.application.settings["compilers_instance"].from_id(
                compiler_id
            )
        except ValueError:
            raise tornado.web.HTTPError(400, "invalid compiler_id")

        code = data.get("code", "")
        context = data.get("context", "")
        compiler_flags = data.get("compiler_flags", "")
        libraries = data.get("libraries", [])  # TODO: implement library support

        config = self.application.settings["config"]
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

            # Convert bytes to base64 for JSON serialization
            import base64

            elf_object_b64 = base64.b64encode(result.elf_object).decode("ascii")

            return {
                "success": True,
                "elf_object": elf_object_b64,
                "errors": result.errors,
            }

        except CompilationError as e:
            return {"success": False, "error": str(e)}

    async def post(self):
        """Handle compilation request."""
        data = self.get_json_body()
        result = await self.compile_code_sync(data)
        self.write(result)


class AssembleHandler(BaseHandler):
    """Assembly endpoint."""

    executor = ThreadPoolExecutor(max_workers=4)

    @run_on_executor
    def assemble_asm_sync(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Synchronous assembly that runs in thread pool."""
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

        config = self.application.settings["config"]
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

            # Convert bytes to base64 for JSON serialization
            import base64

            elf_object_b64 = base64.b64encode(result.elf_object).decode("ascii")

            return {
                "success": True,
                "hash": result.hash,
                "arch": result.arch,
                "elf_object": elf_object_b64,
            }

        except AssemblyError as e:
            return {"success": False, "error": str(e)}

    async def post(self):
        """Handle assembly request."""
        data = self.get_json_body()
        result = await self.assemble_asm_sync(data)
        self.write(result)


class DiffHandler(BaseHandler):
    """Diff generation endpoint."""

    executor = ThreadPoolExecutor(max_workers=4)

    @run_on_executor
    def generate_diff_sync(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Synchronous diff generation that runs in thread pool."""
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

        # Decode base64 elf objects
        import base64

        try:
            target_elf = base64.b64decode(target_elf)
        except Exception as e:
            raise tornado.web.HTTPError(400, f"Invalid base64 target_elf: {e}")

        try:
            compiled_elf = base64.b64decode(compiled_elf)
        except Exception as e:
            raise tornado.web.HTTPError(400, f"Invalid base64 compiled_elf: {e}")

        # Create assembly data object
        from .diff_wrapper import DiffWrapper

        config = self.application.settings["config"]
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

    async def post(self):
        """Handle diff request."""
        data = self.get_json_body()
        result = await self.generate_diff_sync(data)
        self.write(result)


class DecompileHandler(BaseHandler):
    """Decompilation endpoint."""

    executor = ThreadPoolExecutor(max_workers=4)

    @run_on_executor
    def decompile_sync(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Synchronous decompilation that runs in thread pool."""
        platform_id = data.get("platform_id")
        compiler_id = data.get("compiler_id")
        if not platform_id or not compiler_id:
            raise tornado.web.HTTPError(400, "platform_id and compiler_id are required")

        try:
            platform = platforms.from_id(platform_id)
            compiler = self.application.settings["compilers_instance"].from_id(
                compiler_id
            )
        except ValueError:
            raise tornado.web.HTTPError(400, "invalid platform_id or compiler_id")

        default_source_code = data.get("default_source_code", "")
        asm = data.get("asm", "")
        context = data.get("context", "")

        if not asm:
            raise tornado.web.HTTPError(400, "asm is required")

        config = self.application.settings["config"]
        from .decompiler_wrapper import DecompilerWrapper

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

    async def post(self):
        """Handle decompile request."""
        data = self.get_json_body()
        result = await self.decompile_sync(data)
        self.write(result)


def make_app(config: CromperConfig) -> tornado.web.Application:
    """Create and configure the Tornado application."""
    return tornado.web.Application(
        [
            (r"/health", HealthHandler),
            (r"/platforms", PlatformsHandler),
            (r"/compilers", CompilersHandler),
            (r"/libraries", LibrariesHandler),
            (r"/compile", CompileHandler),
            (r"/assemble", AssembleHandler),
            (r"/diff", DiffHandler),
            (r"/decompile", DecompileHandler),
        ],
        debug=config.debug,
        config=config,
        compilers_instance=config.compilers_instance,
    )


async def main():
    """Main application entry point."""
    config = CromperConfig()

    logger.info(f"Starting cromper service on port {config.port}")
    logger.info(f"Debug mode: {config.debug}")
    logger.info(f"Use sandbox jail: {config.use_sandbox_jail}")
    logger.info(f"Compiler base path: {config.compiler_base_path}")

    app = make_app(config)
    app.listen(config.port)

    logger.info("Cromper service started successfully")
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
