import base64
import json
import logging
from typing import Any, Dict, Optional, Sequence

import requests
from django.conf import settings

from coreapp.error import AssemblyError, CompilationError
from coreapp.models.scratch import Asm
from coreapp.libraries import Library

logger = logging.getLogger(__name__)


class CromperClient:
    """Client for communicating with the cromper service."""

    def __init__(self, base_url: str, timeout: int = 30):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make a request to the cromper service."""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, timeout=self.timeout, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Error communicating with cromper service: {e}")
            raise CompilationError(f"Cromper service error: {e}")
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON response from cromper service: {e}")
            raise CompilationError("Invalid response from cromper service")

    def compile_code(
        self,
        compiler: Dict[str, Any],
        compiler_flags: str,
        code: str,
        context: str,
        function: str = "",
        libraries: Sequence[Library] = (),
    ) -> Dict[str, Any]:
        """Compile code using the cromper service."""
        data = {
            "compiler_id": (
                compiler["id"] if isinstance(compiler, dict) else compiler.id
            ),
            "compiler_flags": compiler_flags,
            "code": code,
            "context": context,
            "function": function,
            "libraries": [lib.name for lib in libraries],  # Simplified for now
        }

        response = self._make_request("POST", "/compile", json=data)

        if not response.get("success"):
            error_msg = response.get("error", "Unknown compilation error")
            raise CompilationError(error_msg)

        # Decode the base64 elf object
        elf_object_b64 = response.get("elf_object", "")
        elf_object = base64.b64decode(elf_object_b64)

        return {"elf_object": elf_object, "errors": response.get("errors", "")}

    def assemble_asm(self, platform: Dict[str, Any], asm: Asm) -> Dict[str, Any]:
        """Assemble assembly using the cromper service."""
        data = {
            "platform_id": (
                platform["id"] if isinstance(platform, dict) else platform.id
            ),
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


# Global cromper client instance
_cromper_client: Optional[CromperClient] = None


def get_cromper_client() -> CromperClient:
    """Get the global cromper client instance."""
    global _cromper_client
    if _cromper_client is None:
        _cromper_client = CromperClient(settings.CROMPER_URL)
    return _cromper_client
