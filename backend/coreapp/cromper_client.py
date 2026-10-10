import base64
import binascii
import logging
import time
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any, TypeVar, cast

import requests
from django.conf import settings
from rest_framework.status import HTTP_503_SERVICE_UNAVAILABLE

from coreapp.compiler_utils import (
    Compiler,
    CompilerLanguage,
    Language,
    LanguageOverride,
    Platform,
)
from coreapp.error import AssemblyError, ServiceError
from coreapp.wrapper_result import AssemblyResult, CompilationResult, DiffResult

if TYPE_CHECKING:
    from coreapp.models.scratch import Asm

logger = logging.getLogger(__name__)

_T = TypeVar("_T")


_SERVICE_UNAVAILABLE_MESSAGE = (
    "The compiler service is unavailable. Please try again in a moment."
)


class CromperError(ServiceError):
    """Raised when cromper returns an unexpected or unsuccessful response."""


class CromperUnavailableError(CromperError):
    """Raised when a connection to cromper cannot be established."""

    status_code = HTTP_503_SERVICE_UNAVAILABLE
    code = "ServiceUnavailable"
    public_message = _SERVICE_UNAVAILABLE_MESSAGE


class CromperTimeoutError(CromperError):
    """Exception raised when a cromper request times out."""

    status_code = HTTP_503_SERVICE_UNAVAILABLE
    code = "ServiceUnavailable"
    public_message = _SERVICE_UNAVAILABLE_MESSAGE


class AbstractCromperClient(ABC):
    """Interface shared by real and test cromper clients."""

    @abstractmethod
    def get_compilers(self) -> dict[str, Compiler]:
        raise NotImplementedError

    @abstractmethod
    def get_platforms(self) -> dict[str, Platform]:
        raise NotImplementedError

    @abstractmethod
    def get_libraries(self, platform: str = "") -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def get_compiler_by_id(self, compiler_id: str) -> Compiler:
        raise NotImplementedError

    @abstractmethod
    def get_platform_by_id(self, platform_id: str) -> Platform:
        raise NotImplementedError

    @abstractmethod
    def compile_code(
        self,
        compiler_id: str,
        compiler_flags: str,
        code: str,
        context: str,
        function: str = "",
        libraries: list[dict[str, str]] | None = None,
    ) -> CompilationResult:
        raise NotImplementedError

    @abstractmethod
    def assemble_asm(self, platform_id: str, asm: "Asm") -> AssemblyResult:
        raise NotImplementedError

    @abstractmethod
    def diff(
        self,
        platform_id: str,
        target_elf: bytes,
        compiled_elf: bytes,
        diff_label: str = "",
        diff_flags: list[str] | None = None,
    ) -> DiffResult:
        raise NotImplementedError

    @abstractmethod
    def decompile(
        self,
        platform_id: str,
        compiler_id: str,
        asm: str,
        default_source_code: str = "",
        context: str = "",
    ) -> str:
        raise NotImplementedError


class CromperClient(AbstractCromperClient):
    """Client for communicating with cromper."""

    def __init__(self, base_url: str, timeout: int = 10):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self._compilers_cache: dict[str, Compiler] | None = None
        self._platforms_cache: dict[str, Platform] | None = None
        self._libraries_cache: dict[str, list[dict[str, Any]]] = {}
        self._had_transport_failure = False
        self._version: str | None = None
        self._next_version_check = 0.0

    def _invalidate_caches(self) -> None:
        self._compilers_cache = None
        self._platforms_cache = None
        self._libraries_cache.clear()

    def _check_version(self) -> None:
        """Check for a changed Cromper version at most once a minute."""
        now = time.monotonic()
        if now < self._next_version_check:
            return
        # Limit retries during outages as well as successful checks.
        self._next_version_check = now + 60
        try:
            response = self._make_request("GET", "/healthz")
        except CromperError:
            logger.warning("Could not check Cromper version", exc_info=True)
            return
        version = response.get("version")
        if not isinstance(version, str) or not version:
            # Older Cromper deployments do not expose a version.
            return
        if version != self._version:
            logger.info("Cromper version changed, invalidating metadata caches")
            self._invalidate_caches()
            self._version = version

    def _handle_successful_communication(self) -> None:
        if self._had_transport_failure:
            logger.info("connection to cromper restored, invalidating caches")
            self._invalidate_caches()
            self._had_transport_failure = False

    @staticmethod
    def _require_field(
        response: dict[str, Any], endpoint: str, field: str, expected_type: type[_T]
    ) -> _T:
        try:
            value = response[field]
        except KeyError as e:
            raise CromperError(f"Invalid {endpoint} response: missing {field}") from e

        if not isinstance(value, expected_type):
            raise CromperError(
                f"Invalid {endpoint} response: {field} must be {expected_type.__name__}"
            )
        return value

    @classmethod
    def _require_success(cls, response: dict[str, Any], endpoint: str) -> None:
        success = cls._require_field(response, endpoint, "success", bool)
        if not success:
            error = response.get("error")
            if not isinstance(error, str) or not error:
                error = f"Unknown {endpoint.removeprefix('/')} error"
            raise CromperError(error)

    @classmethod
    def _decode_elf_object(cls, response: dict[str, Any], endpoint: str) -> bytes:
        encoded = cls._require_field(response, endpoint, "elf_object", str)
        try:
            return base64.b64decode(encoded, validate=True)
        except (ValueError, binascii.Error) as e:
            raise CromperError(
                f"Invalid {endpoint} response: malformed elf_object"
            ) from e

    @staticmethod
    def _get_errors(response: dict[str, Any], endpoint: str) -> str:
        errors = response.get("errors", "")
        if not isinstance(errors, str):
            raise CromperError(f"Invalid {endpoint} response: errors must be str")
        return errors

    @staticmethod
    def _http_error(response: requests.Response, endpoint: str) -> CromperError:
        detail = ""
        try:
            payload = response.json()
            if isinstance(payload, dict) and isinstance(payload.get("error"), str):
                detail = payload["error"]
        except ValueError:
            detail = response.text.strip()

        message = f"cromper {endpoint} returned HTTP {response.status_code}"
        if detail:
            message = f"{message}: {detail}"
        return CromperError(message)

    def _make_request(
        self, method: str, endpoint: str, **kwargs: Any
    ) -> dict[str, Any]:
        """Make a request to cromper."""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, timeout=self.timeout, **kwargs)
        except requests.exceptions.Timeout as e:
            self._had_transport_failure = True
            logger.error(f"Timeout communicating with cromper: {e}")
            raise CromperTimeoutError(f"cromper timeout: {e}") from e
        except requests.exceptions.ConnectionError as e:
            self._had_transport_failure = True
            logger.error(f"Error communicating with cromper: {e}")
            raise CromperUnavailableError(f"cromper unavailable: {e}") from e
        except requests.exceptions.RequestException as e:
            self._had_transport_failure = True
            logger.error(f"Error communicating with cromper: {e}")
            raise CromperUnavailableError(f"cromper transport error: {e}") from e

        self._handle_successful_communication()
        if response.status_code >= 400:
            raise self._http_error(response, endpoint)

        try:
            payload = response.json()
        except ValueError as e:
            logger.error(f"Invalid JSON response from cromper: {e}")
            raise CromperError(f"Invalid JSON response from cromper {endpoint}") from e

        if not isinstance(payload, dict):
            raise CromperError(f"Invalid {endpoint} response: expected JSON object")
        return cast(dict[str, Any], payload)

    def get_compilers(self) -> dict[str, Compiler]:
        """Get all compilers from cromper, with caching."""
        self._check_version()
        if self._compilers_cache is None:
            logger.info("Fetching compilers from cromper...")
            response = self._make_request("GET", "/compiler")
            response_json = self._require_field(
                response, "/compiler", "compilers", dict
            )

            compilers: dict[str, Compiler] = {}
            for compiler_id, compiler_data in response_json.items():
                try:
                    if not isinstance(compiler_id, str):
                        raise TypeError("compiler ID must be a string")
                    if not isinstance(compiler_data, dict):
                        raise TypeError("compiler metadata must be an object")
                    response_id = compiler_data.get("id", compiler_id)
                    if response_id != compiler_id:
                        raise ValueError(
                            f"Compiler ID {response_id!r} does not match key "
                            f"{compiler_id!r}"
                        )

                    platform = self.get_platform_by_id(compiler_data["platform"])
                    language_data = compiler_data["language"]
                    default_language = language_data["default"]
                    language = CompilerLanguage(
                        default=Language(**default_language),
                        overrides=tuple(
                            LanguageOverride(**override)
                            for override in language_data["overrides"]
                        ),
                    )
                    compilers[compiler_id] = Compiler(
                        id=compiler_id,
                        platform=platform,
                        flag_class=compiler_data["flags_class"],
                        diff_flag_class=compiler_data["diff_flags_class"],
                        language=language,
                    )
                except (KeyError, TypeError, ValueError) as e:
                    raise CromperError(
                        f"Invalid compiler metadata for {compiler_id!r}: {e}"
                    ) from e

            self._compilers_cache = compilers
            logger.info(f"Cached {len(self._compilers_cache)} compilers")
        return self._compilers_cache

    def get_platforms(self) -> dict[str, Platform]:
        """Get all platforms from cromper, with caching."""
        self._check_version()
        if self._platforms_cache is None:
            logger.info("Fetching platforms from cromper...")
            response = self._make_request("GET", "/platform")
            platforms: dict[str, Platform] = {}
            for platform_id, platform_data in response.items():
                try:
                    if not isinstance(platform_data, dict):
                        raise TypeError("platform metadata must be an object")
                    response_id = platform_data.get("id", platform_id)
                    if response_id != platform_id:
                        raise ValueError(
                            f"Platform ID {response_id!r} does not match key "
                            f"{platform_id!r}"
                        )
                    platforms[platform_id] = Platform(**platform_data)
                except (KeyError, TypeError, ValueError) as e:
                    raise CromperError(
                        f"Invalid platform metadata for {platform_id!r}: {e}"
                    ) from e

            self._platforms_cache = platforms
            logger.info(f"Cached {len(self._platforms_cache)} platforms")
        return self._platforms_cache

    def get_libraries(self, platform: str = "") -> list[dict[str, Any]]:
        """Get available libraries from cromper, cached per platform."""
        self._check_version()
        if platform in self._libraries_cache:
            return self._libraries_cache[platform]
        params = {}
        if platform:
            params["platform"] = platform

        response = self._make_request("GET", "/library", params=params)
        libraries = self._require_field(response, "/library", "libraries", list)
        if not all(isinstance(library, dict) for library in libraries):
            raise CromperError(
                "Invalid /library response: libraries must contain objects"
            )
        self._libraries_cache[platform] = cast(list[dict[str, Any]], libraries)
        return self._libraries_cache[platform]

    def get_compiler_by_id(self, compiler_id: str) -> Compiler:
        """Get a specific compiler by ID."""
        compilers = self.get_compilers()
        if compiler_id not in compilers:
            raise ValueError(f"Unknown compiler: {compiler_id}")
        return compilers[compiler_id]

    def get_platform_by_id(self, platform_id: str) -> Platform:
        """Get a specific platform by ID."""
        try:
            return self.get_platforms()[platform_id]
        except KeyError:
            raise ValueError(f"Unknown platform: {platform_id}") from None

    def compile_code(
        self,
        compiler_id: str,
        compiler_flags: str,
        code: str,
        context: str,
        function: str = "",
        libraries: list[dict[str, str]] | None = None,
    ) -> CompilationResult:
        """Compile code using cromper."""
        if libraries is None:
            libraries = []
        data = {
            "compiler_id": compiler_id,
            "compiler_flags": compiler_flags,
            "code": code,
            "context": context,
            "function": function,
            "libraries": libraries,
        }
        response = self._make_request("POST", "/compile", json=data)

        self._require_success(response, "/compile")
        return CompilationResult(
            elf_object=self._decode_elf_object(response, "/compile"),
            errors=self._get_errors(response, "/compile"),
        )

    def assemble_asm(self, platform_id: str, asm: "Asm") -> AssemblyResult:
        """Assemble assembly using cromper."""
        data = {
            "platform_id": platform_id,
            "asm_data": asm.data,
            "asm_hash": asm.hash,
        }

        response = self._make_request("POST", "/assemble", json=data)

        try:
            self._require_success(response, "/assemble")
        except CromperError as e:
            raise AssemblyError(str(e)) from e

        return AssemblyResult(
            hash=self._require_field(response, "/assemble", "hash", str),
            arch=self._require_field(response, "/assemble", "arch", str),
            elf_object=self._decode_elf_object(response, "/assemble"),
        )

    def diff(
        self,
        platform_id: str,
        target_elf: bytes,
        compiled_elf: bytes,
        diff_label: str = "",
        diff_flags: list[str] | None = None,
    ) -> DiffResult:
        """Generate diff using cromper."""
        # Encode elf object as base64
        if diff_flags is None:
            diff_flags = []
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

        self._require_success(response, "/diff")
        try:
            result = response["result"]
        except KeyError as e:
            raise CromperError("Invalid /diff response: missing result") from e
        if result is not None and not isinstance(result, dict):
            raise CromperError("Invalid /diff response: result must be object or null")
        return DiffResult(
            result=cast(dict[str, Any] | None, result),
            errors=self._get_errors(response, "/diff"),
        )

    def decompile(
        self,
        platform_id: str,
        compiler_id: str,
        asm: str,
        default_source_code: str = "",
        context: str = "",
    ) -> str:
        """Decompile assembly using cromper."""
        data = {
            "platform_id": platform_id,
            "compiler_id": compiler_id,
            "asm": asm,
            "default_source_code": default_source_code,
            "context": context,
        }

        response = self._make_request("POST", "/decompile", json=data)

        self._require_success(response, "/decompile")
        return self._require_field(response, "/decompile", "decompiled_code", str)


# Global cromper client instance
_cromper_client: CromperClient | None = None


def get_cromper_client() -> CromperClient:
    """Get the global cromper client instance."""
    global _cromper_client
    if _cromper_client is None:
        _cromper_client = CromperClient(settings.CROMPER_URL)
    return _cromper_client
