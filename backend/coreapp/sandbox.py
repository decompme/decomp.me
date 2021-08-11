from typing import Dict, Iterator, Optional, List, Union
from django.conf import settings
import logging
import os
from pathlib import Path
import shlex
import subprocess
from tempfile import TemporaryDirectory
import contextlib

logger = logging.getLogger(__name__)


class Sandbox(contextlib.AbstractContextManager["Sandbox"]):
    def __enter__(self):
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

    def __exit__(self, *exc):
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
        assert ":" not in str(self.path)
        # fmt: off
        wrapper = [
            str(settings.SANDBOX_NSJAIL_BIN_PATH),
            "--mode", "o",
            "--chroot", str(settings.SANDBOX_CHROOT_PATH),
            "--bindmount", f"{self.path}:/tmp",
            "--bindmount_ro", "/bin",
            "--bindmount_ro", "/lib",
            "--bindmount_ro", "/lib64",
            "--bindmount_ro", "/usr",
            "--env", "PATH=/usr/bin:/bin",
            "--disable_proc",  # Needed for running inside Docker
            "--time_limit", "30",  # seconds
        ]
        # fmt: on

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
    ) -> subprocess.CompletedProcess[str]:
        mounts = mounts if mounts is not None else []
        env = env if env is not None else {}

        wrapper = self.sandbox_command(mounts, env)
        if shell:
            assert isinstance(args, str)
            command = wrapper + ["/bin/bash", "-euo", "pipefail", "-c", args]
        else:
            assert isinstance(args, list)
            command = wrapper + args

        debug_env_str = " ".join(
            f"{key}={shlex.quote(value)}" for key, value in env.items()
        )
        logger.debug(f"Sandbox Command: {debug_env_str} {shlex.join(command)}")
        return subprocess.run(
            command, capture_output=True, text=True, env=env, check=True, shell=False
        )
