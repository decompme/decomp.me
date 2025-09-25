import base64
import json
import logging
from typing import Any, Dict, Optional

import requests
from django.conf import settings

from coreapp.error import AssemblyError, CompilationError
from coreapp.models.scratch import Asm

logger = logging.getLogger(__name__)


class CromperClient:
    """Client for communicating with the cromper service."""

    def __init__(self, base_url: str, timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self._compilers_cache: Optional[Dict[str, Dict[str, Any]]] = None
        self._platforms_cache: Optional[Dict[str, Dict[str, Any]]] = None

    def _make_request(
        self, method: str, endpoint: str, **kwargs: Any
    ) -> Dict[str, Any]:
        """Make a request to the cromper service."""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, timeout=self.timeout, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error communicating with cromper service: {e}")
            raise CompilationError(f"cromper service error: {e}")
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON response from cromper service: {e}")
            raise CompilationError("Invalid response from cromper service")

    def get_compilers(self) -> Dict[str, Dict[str, Any]]:
        """Get all compilers from cromper service, with caching."""
        if self._compilers_cache is None:
            logger.info("Fetching compilers from cromper service...")
            response = self._make_request("GET", "/compilers")
            self._compilers_cache = response.get("compilers", {})
            logger.info(f"Cached {len(self._compilers_cache)} compilers")
        return self._compilers_cache

    def get_platforms(self) -> Dict[str, Dict[str, Any]]:
        """Get all platforms from cromper service, with caching."""
        if self._platforms_cache is None:
            logger.info("Fetching platforms from cromper service...")
            response = self._make_request("GET", "/platforms")
            self._platforms_cache = response.get("platforms", {})
            logger.info(f"Cached {len(self._platforms_cache)} platforms")
        return self._platforms_cache

    def get_compiler_by_id(self, compiler_id: str) -> Dict[str, Any]:
        """Get a specific compiler by ID."""
        compilers = self.get_compilers()
        if compiler_id not in compilers:
            raise ValueError(f"Unknown compiler: {compiler_id}")
        return compilers[compiler_id]

    def get_platform_by_id(self, platform_id: str) -> Dict[str, Any]:
        """Get a specific platform by ID."""
        platforms = self.get_platforms()
        platforms_by_id = {x["id"]: x for x in platforms}

        if platform_id not in platforms_by_id:
            raise ValueError(f"Unknown platform: {platform_id}")
        return platforms_by_id[platform_id]

    def refresh_cache(self) -> None:
        """Force refresh of compilers and platforms cache."""
        self._compilers_cache = None
        self._platforms_cache = None
        # Trigger reload
        self.get_compilers()
        self.get_platforms()

    def compile_code(
        self,
        compiler_id: str,
        compiler_flags: str,
        code: str,
        context: str,
        function: str = "",
        libraries: list[str] = [],
    ) -> Dict[str, Any]:
        """Compile code using the cromper service."""
        data = {
            "compiler_id": compiler_id,
            "compiler_flags": compiler_flags,
            "code": code,
            "context": context,
            "function": function,
            "libraries": libraries,
        }

        response = self._make_request("POST", "/compile", json=data)

        if not response.get("success"):
            error_msg = response.get("error", "Unknown compilation error")
            raise CompilationError(error_msg)

        # Decode the base64 elf object
        elf_object_b64 = response.get("elf_object", "")
        elf_object = base64.b64decode(elf_object_b64)

        return {"elf_object": elf_object, "errors": response.get("errors", "")}

    def assemble_asm(self, platform_id: str, asm: Asm) -> Dict[str, Any]:
        """Assemble assembly using the cromper service."""
        data = {
            "platform_id": platform_id,
            "asm_data": asm.data,
            "asm_hash": asm.hash,
        }

        response = self._make_request("POST", "/assemble", json=data)

        if not response.get("success"):
            error_msg = response.get("error", "Unknown assembly error")
            raise AssemblyError(error_msg)

        # Decode the base64 elf object
        elf_object_b64 = response.get("elf_object", "")
        elf_object = base64.b64decode(elf_object_b64)

        return {
            "hash": response.get("hash"),
            "arch": response.get("arch"),
            "elf_object": elf_object,
        }

    def get_libraries(self, platform: str = "") -> list[dict[str, Any]]:
        """Get available libraries from the cromper service."""
        params = {}
        if platform:
            params["platform"] = platform

        response = self._make_request("GET", "/libraries", params=params)
        return response.get("libraries", [])

    def diff(
        self,
        platform_id: str,
        target_elf: bytes,
        compiled_elf: bytes,
        diff_label: str = "",
        diff_flags: list[str] = [],
    ) -> Dict[str, Any]:
        """Generate diff using the cromper service."""
        # Encode elf object as base64

        target_elf_b64 = base64.b64encode(target_elf).decode("utf-8")
        compiled_elf_b64 = base64.b64encode(compiled_elf).decode("utf-8")

        data = {
            "platform_id": platform_id,
            "target_elf": target_elf_b64,
            "compiled_elf": compiled_elf_b64,
            "diff_label": diff_label,
            "diff_flags": diff_flags,
        }

        response = self._make_request("POST", "/diff", json=data)

        if not response.get("success"):
            error_msg = response.get("error", "Unknown diff error")
            raise CompilationError(error_msg)

        return {
            "result": response.get("result"),
            "errors": response.get("errors"),
        }

    def decompile(
        self,
        platform_id: str,
        compiler_id: str,
        asm: str,
        default_source_code: str = "",
        context: str = "",
    ) -> str:
        """Decompile assembly using the cromper service."""
        data = {
            "platform_id": platform_id,
            "compiler_id": compiler_id,
            "asm": asm,
            "default_source_code": default_source_code,
            "context": context,
        }

        response = self._make_request("POST", "/decompile", json=data)

        if not response.get("success"):
            error_msg = response.get("error", "Unknown decompilation error")
            raise CompilationError(error_msg)

        return response.get("decompiled_code", "")


# Global cromper client instance
_cromper_client: Optional[CromperClient] = None


def get_cromper_client() -> CromperClient:
    """Get the global cromper client instance."""
    global _cromper_client
    if _cromper_client is None:
        _cromper_client = CromperClient(settings.CROMPER_URL)
    return _cromper_client
