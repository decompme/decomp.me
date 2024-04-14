import logging
from typing import Dict, List, Any

import requests

from django.utils.timezone import now

from rest_framework.exceptions import APIException

from .libraries import LibraryVersions

# FIXME: circular import!
# from .platforms import Platform
# from .compilers import Compiler

logger = logging.getLogger(__name__)


class ManagedSession:
    # TODO: version? os? use_ssl?

    def __init__(self, hostname, port, compilers_hash, libraries_hash) -> None:
        self.hostname = hostname
        self.port = port
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

    PLATFORMS: Dict[str, List[Any]] = dict()
    COMPILERS: Dict[str, List[Any]] = dict()
    LIBRARIES: Dict[str, List[Any]] = dict()

    last_updated = now()

    def is_known_host(self, hostname: str, port: int) -> bool:
        return (hostname, port) in self.sessions

    def add_host(
        self,
        hostname: str,
        port: int,
        compilers: List[Any],
        compilers_hash: str,
        libraries: List[Any],
        libraries_hash: str,
    ) -> None:
        # FIXME: move to top of the file...
        from .compilers import Compiler

        session = self.sessions.get((hostname, port))
        if (
            session is None
            or compilers_hash != session.compilers_hash
            or libraries_hash != session.libraries_hash
        ):
            if session is None:
                session = ManagedSession(hostname, port, compilers_hash, libraries_hash)
                update_compilers = update_libraries = True
            else:
                update_compilers = compilers_hash != session.compilers_hash
                update_libraries = libraries_hash != session.libraries_hash

            if update_compilers:
                platforms = set()
                for compiler_dict in compilers:
                    try:
                        compiler = Compiler.from_dict(compiler_dict)
                    except Exception as e:
                        logger.error(
                            "Failed to create Compiler from %s, %s", compiler_dict, e
                        )
                        return

                    if compiler.id not in self.COMPILERS:
                        self.COMPILERS[compiler.id] = compiler

                    platforms.add(compiler.platform.id)

                    # external lookup
                    if compiler.platform.id not in self.PLATFORMS:
                        self.PLATFORMS[compiler.platform.id] = compiler.platform

                    # internal lookup
                    if compiler.id not in self.compilers:
                        self.compilers[compiler.id] = []
                    self.compilers[compiler.id].append(
                        (hostname, port),
                    )

                for platform in platforms:
                    if platform not in self.platforms:
                        self.platforms[platform] = []
                    self.platforms[platform].append(
                        (hostname, port),
                    )
            if update_libraries:
                for library in libraries:
                    library_version = LibraryVersions(**library)

                    if library_version.name not in self.LIBRARIES:
                        self.LIBRARIES[library_version.name] = library_version

            self.sessions[(hostname, port)] = session

            self.last_updated = now()
            logger.info(
                "Successfully registered %s:%i with %i platform(s), %i compiler(s) and %i library(s)",
                hostname,
                port,
                len(platforms),
                len(compilers),
                len(libraries),
            )
        else:
            # logger.debug(f"Ignoring '/register' from {hostname}:{port} as compiler_hash is the same ({compilers_hash})")
            pass

    def available_compilers(self) -> List[Any]:
        return list(sorted(self.COMPILERS.values(), key=lambda x: x.id))

    def available_platforms(self) -> List[Any]:
        return list(sorted(self.PLATFORMS.values(), key=lambda x: x.name))

    def available_libraries(self) -> List[LibraryVersions]:
        return list(sorted(self.LIBRARIES.values(), key=lambda x: x.name))

    def get_compiler_by_id(self, compiler_id):
        compiler = self.COMPILERS.get(compiler_id)
        if not compiler:
            raise APIException(f"{compiler_id} not known/available")
        return compiler

    def get_platform_by_id(self, platform_id):
        platform = self.PLATFORMS.get(platform_id)
        if not platform:
            raise APIException(f"{platform_id} not known/available")
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
