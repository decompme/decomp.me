import json
import traceback
from typing import Any, Dict

import tornado.web

from cromper import platforms, libraries


class BaseHandler(tornado.web.RequestHandler):
    """Base handler with common functionality."""

    def initialize(self, executor):
        self.executor = executor

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


class PlatformHandler(BaseHandler):
    """Platforms information endpoint."""

    def get(self, id=None):
        """Get all available platforms."""
        platforms_data = []
        compilers_instance = self.application.settings["compilers_instance"]
        available_platforms = platforms._platforms
        if id is not None:
            if id in available_platforms:
                return self.write(
                    platforms._platforms[id].to_json(
                        compilers=compilers_instance,
                        include_compilers=True,
                    )
                )

            self.set_status(404)
            return self.write({"error": "Unknown platform"})

        for platform in available_platforms.values():
            platforms_data.append(
                platform.to_json(
                    compilers=compilers_instance,
                    include_compilers=True,
                )
            )
        # TODO: remove this 'platforms' key one day
        self.write({"platforms": platforms_data})


class CompilerHandler(BaseHandler):
    """Compilers information endpoint."""

    def get(self, platform_id=None, compiler_id=None):
        """Get all available compilers."""
        available_compilers = self.application.settings[
            "compilers_instance"
        ].available_compilers()

        compilers_data = {
            c.id: c.to_json()
            for c in available_compilers
            if (platform_id is None or c.platform.id == platform_id)
            and (compiler_id is None or c.id == compiler_id)
        }
        if len(compilers_data) == 0:
            self.set_status(404)
            return self.write({"error": "Unknown platform/compiler"})

        if compiler_id:
            return self.write(compilers_data)

        # TODO: Remove this 'compilers' key one day
        return self.write({"compilers": compilers_data})


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
