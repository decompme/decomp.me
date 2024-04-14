import logging
from typing import Dict, List, Any

import requests

from django.utils.timezone import now

from rest_framework.exceptions import APIException

from .libraries import LibraryVersions

from .platforms import Platform, DUMMY_PLATFORM
from .compilers import Compiler, DUMMY_COMPILER

logger = logging.getLogger(__name__)


class ManagedSession:
    # TODO: version? os? use_ssl?

    def __init__(
        self, hostname, port, platforms_hash, compilers_hash, libraries_hash
    ) -> None:
        self.hostname = hostname
        self.port = port
        self.platforms_hash = platforms_hash
        self.compilers_hash = compilers_hash
        self.libraries_hash = libraries_hash
        self.session = requests.Session()

    def __str__(self) -> str:
        return f"{self.hostname}:{self.port}"

    def post(self, endpoint, data, *args, **kwargs) -> requests.Response:
        if not endpoint.startswith("/"):
            endpoint = "/" + endpoint
        url = f"http://{self.hostname}:{self.port}{endpoint}"
        return self.session.post(url, *args, json=data, **kwargs)

    def compile(self, data, *args, **kwargs) -> requests.Response:
        return self.post("/compile", data, *args, **kwargs)

    def assemble(self, data, *args, **kwargs) -> requests.Response:
        return self.post("/assemble", data, *args, **kwargs)

    def objdump(self, data, *args, **kwargs) -> requests.Response:
        return self.post("/objdump", data, *args, **kwargs)


class Registry:
    # (hostname, port) -> Session
    sessions: Dict[tuple[str, int], ManagedSession] = dict()
    # platform -> [(hostname, port), ...]
    platforms: Dict[str, List[tuple[str, int]]] = dict()
    # compiler_id -> [(hostname, port), ...]
    compilers: Dict[str, List[tuple[str, int]]] = dict()

    PLATFORMS: Dict[str, List[Platform]] = dict()
    COMPILERS: Dict[str, List[Compiler]] = dict()
    LIBRARIES: Dict[str, List[LibraryVersions]] = dict()

    last_updated = now()

    def is_known_host(self, hostname: str, port: int) -> bool:
        return (hostname, port) in self.sessions

    def register_host(
        self,
        hostname: str,
        port: int,
        platforms: List[Any],
        platforms_hash: str,
        compilers: List[Any],
        compilers_hash: str,
        libraries: List[Any],
        libraries_hash: str,
    ) -> None:
        session = self.sessions.get((hostname, port))
        if (
            session is None
            or platforms_hash != session.platforms_hash
            or compilers_hash != session.compilers_hash
            or libraries_hash != session.libraries_hash
        ):
            if session is None:
                session = ManagedSession(
                    hostname, port, platforms_hash, compilers_hash, libraries_hash
                )
                update_platforms = update_compilers = update_libraries = True
            else:
                update_platforms = platforms_hash != session.platforms_hash
                update_compilers = compilers_hash != session.compilers_hash
                update_libraries = libraries_hash != session.libraries_hash

            if update_platforms:

                for platform_dict in platforms:
                    try:
                        platform = Platform.from_dict(platform_dict)
                    except Exception as e:
                        logger.error(
                            "Failed to create Platform from %s, %s", platform_dict, e
                        )
                        return False

                    # assume new/updated data, so overwrite existing
                    self.PLATFORMS[platform.id] = platform

                    if platform.id not in self.platforms:
                        self.platforms[platform.id] = []
                    self.platforms[platform.id].append(
                        (hostname, port),
                    )

            if update_compilers:
                for compiler_dict in compilers:
                    try:
                        compiler = Compiler.from_dict(compiler_dict)
                    except Exception as e:
                        logger.error(
                            "Failed to create Compiler from %s, %s", compiler_dict, e
                        )
                        return False

                    # assume new/updated data, so overwrite existing
                    self.COMPILERS[compiler.id] = compiler

                    # internal lookup
                    if compiler.id not in self.compilers:
                        self.compilers[compiler.id] = []
                    self.compilers[compiler.id].append(
                        (hostname, port),
                    )

            if update_libraries:
                for library in libraries:
                    try:
                        library_version = LibraryVersions(**library)
                    except Exception as e:
                        logger.error("Failed to create Library from %s, %s", library, e)
                        return False

                    if library_version.name not in self.LIBRARIES:
                        self.LIBRARIES[library_version.name] = library_version

            self.sessions[(hostname, port)] = session

            self.last_updated = now()
            logger.info(
                "Successfully registered host %s:%i with %i platform(s), %i compiler(s) and %i library(s)",
                hostname,
                port,
                len(platforms),
                len(compilers),
                len(libraries),
            )
            return True

    def available_compilers(self) -> List[Any]:
        return list(sorted(self.COMPILERS.values(), key=lambda x: x.id))

    def available_platforms(self) -> List[Any]:
        return list(sorted(self.PLATFORMS.values(), key=lambda x: x.name))

    def available_libraries(self) -> List[LibraryVersions]:
        return list(sorted(self.LIBRARIES.values(), key=lambda x: x.name))

    def get_compiler_by_id(self, compiler_id):
        if compiler_id == "dummy":
            return DUMMY_COMPILER

        compiler = self.COMPILERS.get(compiler_id)
        if not compiler:
            logger.warning("No known compiler with id %s", compiler_id)
            return None
        return compiler

    def get_platform_by_id(self, platform_id):
        if platform_id == "dummy":
            return DUMMY_PLATFORM

        platform = self.PLATFORMS.get(platform_id)
        if not platform:
            logger.warning("No known platform with id %s", platform_id)
            # raise APIException(f"{platform_id} not known/available")
        return platform

    def get_session_for_platform(self, platform_id) -> ManagedSession:
        available_hosts = self.platforms.get(platform_id)
        if available_hosts is None:
            return None
        if len(available_hosts) == 0:
            # TODO: pop platform_id from self.platforms if empty
            return None

        host = available_hosts[0]  # TODO: round-robin? take first for now...
        return self.sessions.get(host)

    def get_session_for_compiler(self, compiler_id) -> ManagedSession:
        available_hosts = self.compilers.get(compiler_id)
        if available_hosts is None:
            return None
        if len(available_hosts) == 0:
            return None

        host = available_hosts[0]  # TODO: round-robin? take first for now...
        return self.sessions.get(host)


registry = Registry()
