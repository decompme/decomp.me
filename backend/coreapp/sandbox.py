import contextlib
import logging
import os
import shlex
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any, Dict, List, Optional, Union

from django.conf import settings

from coreapp.error import SandboxError

logger = logging.getLogger(__name__)


class Sandbox(contextlib.AbstractContextManager["Sandbox"]):
    def __enter__(self) -> "Sandbox":
        self.use_jail = settings.USE_SANDBOX_JAIL

        tmpdir: Optional[str] = None
        if self.use_jail:
            # Only use SANDBOX_TMP_PATH if USE_SANDBOX_JAIL is enabled,
            # otherwise use the system default
            settings.SANDBOX_TMP_PATH.mkdir(parents=True, exist_ok=True)
            tmpdir = str(settings.SANDBOX_TMP_PATH)

        self.temp_dir = TemporaryDirectory(dir=tmpdir)
        self.path = Path(self.temp_dir.name)
        return self

    def __exit__(self, *exc: Any) -> None:
        self.temp_dir.cleanup()

    @staticmethod
    def quote_options(opts: str) -> str:
        return shlex.join(shlex.split(opts))

    def rewrite_path(self, path: Path) -> str:
        if self.use_jail and path.is_relative_to(self.path):
            path = Path("/tmp") / path.relative_to(self.path)
        return str(path)

    def sandbox_command(self, mounts: List[Path], env: Dict[str, str]) -> List[str]:
        if not self.use_jail:
            return []

        settings.SANDBOX_CHROOT_PATH.mkdir(parents=True, exist_ok=True)
        settings.WINEPREFIX.mkdir(parents=True, exist_ok=True)

        assert ":" not in str(self.path)
        assert ":" not in str(settings.WINEPREFIX)
        # fmt: off
        wrapper = [
            str(settings.SANDBOX_NSJAIL_BIN_PATH),
            "--mode", "o",
            "--chroot", str(settings.SANDBOX_CHROOT_PATH),
            "--bindmount", f"{self.path}:/tmp",
            "--bindmount", f"{self.path}:/run/user/{os.getuid()}",
            "--bindmount_ro", "/dev",
            "--bindmount_ro", "/bin",
            "--bindmount_ro", "/etc/alternatives",
            "--bindmount_ro", "/etc/fonts",
            "--bindmount_ro", "/etc/passwd",
            "--bindmount_ro", "/lib",
            "--bindmount_ro", "/lib64",
            "--bindmount_ro", "/usr",
            "--bindmount_ro", "/proc",
            "--bindmount", f"{self.path}:/var/tmp",
            "--bindmount_ro", str(settings.COMPILER_BASE_PATH),
            "--bindmount_ro", str(settings.LIBRARY_BASE_PATH),
            "--env", "PATH=/usr/bin:/bin",
            "--cwd", "/tmp",
            "--rlimit_fsize", "soft",
            "--rlimit_nofile", "soft",
            # the following are settings that can be removed once we are done with wine
            "--bindmount_ro", f"{settings.WINEPREFIX}:/wine",
            "--env", "WINEDEBUG=-all",
            "--env", "WINEPREFIX=/wine",
        ]
        # fmt: on
        if settings.SANDBOX_DISABLE_PROC:
            wrapper.append("--disable_proc")  # needed for running inside Docker

        if not settings.DEBUG:
            wrapper.append("--really_quiet")
        for mount in mounts:
            wrapper.extend(["--bindmount_ro", str(mount)])
        for key in env:
            wrapper.extend(["--env", key])

        wrapper.append("--")
        return wrapper

    def run_subprocess(
        self,
        args: Union[str, List[str]],
        *,
        mounts: Optional[List[Path]] = None,
        env: Optional[Dict[str, str]] = None,
        shell: bool = False,
        timeout: Optional[float] = None,
    ) -> subprocess.CompletedProcess[str]:
        mounts = mounts if mounts is not None else []
        env = env if env is not None else {}
        timeout = None if timeout == 0 else timeout

        try:
            wrapper = self.sandbox_command(mounts, env)
        except Exception as e:
            raise SandboxError(f"Failed to initialize sandbox command: {e}")

        if shell:
            if isinstance(args, list):
                args = " ".join(args)

            command = wrapper + ["/bin/bash", "-euo", "pipefail", "-c", args]
        else:
            assert isinstance(args, list)
            command = wrapper + args

        debug_env_str = " ".join(
            f"{key}={shlex.quote(value)}" for key, value in env.items() if key != "PATH"
        )
        logger.debug(f"Sandbox Command: {debug_env_str} {shlex.join(command)}")
        return subprocess.run(
            command,
            text=True,
            errors="backslashreplace",
            env=env,
            cwd=self.path,
            check=True,
            shell=False,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            timeout=timeout,
        )
