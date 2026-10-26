import asyncio
import base64
import binascii
import logging
import threading
import time
from abc import ABC, abstractmethod
from typing import TYPE_CHECKING, Any, TypeVar, cast

import httpx
import requests
from django.conf import settings
from rest_framework.status import (
    HTTP_429_TOO_MANY_REQUESTS,
    HTTP_503_SERVICE_UNAVAILABLE,
)

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

# Limit outgoing connections; requests waiting for a connection are not bounded
# by this pool. Cromper separately limits outstanding tool jobs.
_ASYNC_LIMITS = httpx.Limits(max_connections=32, max_keepalive_connections=16)


class CromperError(ServiceError):
    """Raised when cromper returns an unexpected or unsuccessful response."""


class CromperUnavailableError(CromperError):
    """Raised when cromper is unreachable or reports service unavailability."""

    status_code = HTTP_503_SERVICE_UNAVAILABLE
    code = "ServiceUnavailable"
    public_message = _SERVICE_UNAVAILABLE_MESSAGE


class CromperBusyError(CromperError):
    """Raised when cromper rejects work because its tool executor is full."""

    status_code = HTTP_429_TOO_MANY_REQUESTS
    code = "TooManyRequests"
    public_message = "The compiler service is busy. Please try again in a moment."
    retry_after = 1


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
    async def compile_code(
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
    async def assemble_asm(self, platform_id: str, asm: "Asm") -> AssemblyResult:
        raise NotImplementedError

    @abstractmethod
    async def diff(
        self,
        platform_id: str,
        target_elf: bytes,
        compiled_elf: bytes,
        diff_label: str = "",
        diff_flags: list[str] | None = None,
    ) -> DiffResult:
        raise NotImplementedError

    @abstractmethod
    async def decompile(
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
        self._async_client: httpx.AsyncClient | None = None
        self._async_client_loop: asyncio.AbstractEventLoop | None = None
        self._cache_lock = threading.RLock()
        self._cache_generation = 0
        self._compilers_cache: dict[str, Compiler] | None = None
        self._platforms_cache: dict[str, Platform] | None = None
        self._libraries_cache: dict[str, list[dict[str, Any]]] = {}
        self._had_transport_failure = False
        self._version: str | None = None
        self._next_version_check = 0.0

    async def aclose(self) -> None:
        if self._async_client is not None:
            await self._async_client.aclose()
            self._async_client = None
            self._async_client_loop = None

    async def aopen(self) -> None:
        """Open the shared pool on ASGI startup, paired with shutdown's aclose."""
        if self._async_client is None:
            self._async_client = httpx.AsyncClient(
                timeout=self.timeout, limits=_ASYNC_LIMITS
            )
            self._async_client_loop = asyncio.get_running_loop()

    def _invalidate_caches(self) -> None:
        with self._cache_lock:
            self._cache_generation += 1
            self._compilers_cache = None
            self._platforms_cache = None
            self._libraries_cache.clear()

    def _check_version(self) -> None:
        """Check for a changed Cromper version at most once a minute."""
        now = time.monotonic()
        with self._cache_lock:
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
        with self._cache_lock:
            if version != self._version:
                logger.info("Cromper version changed, invalidating metadata caches")
                self._invalidate_caches()
                self._version = version

    def _handle_transport_failure(self) -> None:
        with self._cache_lock:
            self._had_transport_failure = True

    def _handle_successful_communication(self) -> None:
        with self._cache_lock:
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
    def _http_error(
        response: "requests.Response | httpx.Response", endpoint: str
    ) -> CromperError:
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
        if response.status_code == HTTP_429_TOO_MANY_REQUESTS:
            return CromperBusyError(message)
        if response.status_code == HTTP_503_SERVICE_UNAVAILABLE:
            return CromperUnavailableError(message)
        return CromperError(message)

    def _parse_response(
        self, response: "requests.Response | httpx.Response", endpoint: str
    ) -> dict[str, Any]:
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

    def _make_request(
        self, method: str, endpoint: str, **kwargs: Any
    ) -> dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, timeout=self.timeout, **kwargs)
        except requests.exceptions.Timeout as e:
            self._handle_transport_failure()
            logger.error(f"Timeout communicating with cromper: {e}")
            raise CromperTimeoutError(f"cromper timeout: {e}") from e
        except requests.exceptions.ConnectionError as e:
            self._handle_transport_failure()
            logger.error(f"Error communicating with cromper: {e}")
            raise CromperUnavailableError(f"cromper unavailable: {e}") from e
        except requests.exceptions.RequestException as e:
            self._handle_transport_failure()
            logger.error(f"Error communicating with cromper: {e}")
            raise CromperUnavailableError(f"cromper transport error: {e}") from e

        return self._parse_response(response, endpoint)

    async def _make_request_async(
        self, method: str, endpoint: str, **kwargs: Any
    ) -> dict[str, Any]:
        url = f"{self.base_url}{endpoint}"
        try:
            if (
                self._async_client is not None
                and self._async_client_loop is asyncio.get_running_loop()
            ):
                response = await self._async_client.request(method, url, **kwargs)
            else:
                # WSGI and standalone callers have no ASGI shutdown event, so
                # close their connections before their event loop goes away.
                async with httpx.AsyncClient(
                    timeout=self.timeout, limits=_ASYNC_LIMITS
                ) as client:
                    response = await client.request(method, url, **kwargs)
        except httpx.TimeoutException as e:
            self._handle_transport_failure()
            logger.error(f"Timeout communicating with cromper: {e}")
            raise CromperTimeoutError(f"cromper timeout: {e}") from e
        except httpx.RequestError as e:
            self._handle_transport_failure()
            logger.error(f"Error communicating with cromper: {e}")
            raise CromperUnavailableError(f"cromper unavailable: {e}") from e

        return self._parse_response(response, endpoint)

    def get_compilers(self) -> dict[str, Compiler]:
        """Get all compilers from cromper, with caching."""
        self._check_version()
        with self._cache_lock:
            compilers = self._compilers_cache
            generation = self._cache_generation
        if compilers is None:
            logger.info("Fetching compilers from cromper...")
            response = self._make_request("GET", "/compiler")
            response_json = self._require_field(
                response, "/compiler", "compilers", dict
            )

            compilers = {}
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

            with self._cache_lock:
                # A recovery or version change during the fetch must not let
                # an older response repopulate the invalidated cache.
                if generation == self._cache_generation:
                    self._compilers_cache = compilers
            logger.info(f"Fetched {len(compilers)} compilers")
        return compilers

    def get_platforms(self) -> dict[str, Platform]:
        """Get all platforms from cromper, with caching."""
        self._check_version()
        with self._cache_lock:
            platforms = self._platforms_cache
            generation = self._cache_generation
        if platforms is None:
            logger.info("Fetching platforms from cromper...")
            response = self._make_request("GET", "/platform")
            platforms = {}
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

            with self._cache_lock:
                if generation == self._cache_generation:
                    self._platforms_cache = platforms
            logger.info(f"Fetched {len(platforms)} platforms")
        return platforms

    def get_libraries(self, platform: str = "") -> list[dict[str, Any]]:
        """Get available libraries from cromper, cached per platform."""
        self._check_version()
        with self._cache_lock:
            cached = self._libraries_cache.get(platform)
            generation = self._cache_generation
        if cached is not None:
            return cached
        params = {}
        if platform:
            params["platform"] = platform

        response = self._make_request("GET", "/library", params=params)
        libraries = self._require_field(response, "/library", "libraries", list)
        if not all(isinstance(library, dict) for library in libraries):
            raise CromperError(
                "Invalid /library response: libraries must contain objects"
            )
        result = cast(list[dict[str, Any]], libraries)
        with self._cache_lock:
            if generation == self._cache_generation:
                self._libraries_cache[platform] = result
        return result

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

    async def compile_code(
        self,
        compiler_id: str,
        compiler_flags: str,
        code: str,
        context: str,
        function: str = "",
        libraries: list[dict[str, str]] | None = None,
    ) -> CompilationResult:
        """Compile code using cromper."""
        response = await self._make_request_async(
            "POST",
            "/compile",
            json={
                "compiler_id": compiler_id,
                "compiler_flags": compiler_flags,
                "code": code,
                "context": context,
                "function": function,
                "libraries": libraries or [],
            },
        )
        self._require_success(response, "/compile")
        return CompilationResult(
            elf_object=self._decode_elf_object(response, "/compile"),
            errors=self._get_errors(response, "/compile"),
        )

    async def assemble_asm(self, platform_id: str, asm: "Asm") -> AssemblyResult:
        """Assemble assembly using cromper."""
        response = await self._make_request_async(
            "POST",
            "/assemble",
            json={
                "platform_id": platform_id,
                "asm_data": asm.data,
                "asm_hash": asm.hash,
            },
        )
        try:
            self._require_success(response, "/assemble")
        except CromperError as e:
            raise AssemblyError(str(e)) from e

        return AssemblyResult(
            hash=self._require_field(response, "/assemble", "hash", str),
            arch=self._require_field(response, "/assemble", "arch", str),
            elf_object=self._decode_elf_object(response, "/assemble"),
        )

    async def diff(
        self,
        platform_id: str,
        target_elf: bytes,
        compiled_elf: bytes,
        diff_label: str = "",
        diff_flags: list[str] | None = None,
    ) -> DiffResult:
        """Generate diff using cromper."""
        response = await self._make_request_async(
            "POST",
            "/diff",
            json={
                "platform_id": platform_id,
                "target_elf": base64.b64encode(target_elf).decode("utf-8"),
                "compiled_elf": base64.b64encode(compiled_elf).decode("utf-8"),
                "diff_label": diff_label,
                "diff_flags": diff_flags or [],
            },
        )
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

    async def decompile(
        self,
        platform_id: str,
        compiler_id: str,
        asm: str,
        default_source_code: str = "",
        context: str = "",
    ) -> str:
        """Decompile assembly using cromper."""
        response = await self._make_request_async(
            "POST",
            "/decompile",
            json={
                "platform_id": platform_id,
                "compiler_id": compiler_id,
                "asm": asm,
                "default_source_code": default_source_code,
                "context": context,
            },
        )
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


async def open_cromper_client() -> None:
    await get_cromper_client().aopen()


async def close_cromper_client() -> None:
    if _cromper_client is not None:
        await _cromper_client.aclose()
