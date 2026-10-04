import contextlib
import logging
import os
import shlex
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Self

from .config import CromperConfig

logger = logging.getLogger(__name__)


class SandboxError(Exception):
    """Sandbox execution error."""


class Sandbox(contextlib.AbstractContextManager["Sandbox"]):
    def __init__(self, config: CromperConfig):
        self.config = config

    def __enter__(self) -> Self:
        tmpdir: str | None = None
        if self.config.use_sandbox_jail:
            # Only use sandbox_tmp_path if USE_SANDBOX_JAIL is enabled,
            # otherwise use the system default
            self.config.sandbox_tmp_path.mkdir(parents=True, exist_ok=True)
            tmpdir = str(self.config.sandbox_tmp_path)

        self.temp_dir = TemporaryDirectory(dir=tmpdir, ignore_cleanup_errors=True)
        self.path = Path(self.temp_dir.name)
        return self

    def __exit__(self, *exc: object) -> None:
        self.temp_dir.cleanup()

    @staticmethod
    def quote_options(opts: str) -> str:
        return shlex.join(shlex.split(opts))

    def rewrite_path(self, path: Path) -> str:
        if self.config.use_sandbox_jail and path.is_relative_to(self.path):
            path = Path("/tmp") / path.relative_to(self.path)
        return str(path)

    def sandbox_command(self, mounts: list[Path], env: dict[str, str]) -> list[str]:
        if not self.config.use_sandbox_jail:
            return []

        self.config.sandbox_chroot_path.mkdir(parents=True, exist_ok=True)

        assert ":" not in str(self.path)

        # fmt: off
        wrapper = [
            str(self.config.nsjail_bin_path),
            "--mode", "o",
            "--chroot", str(self.config.sandbox_chroot_path),
            "--bindmount", f"{self.path}:/tmp",
            "--bindmount", f"{self.path}:/run/user/{os.getuid()}",
            "--bindmount", f"{self.path}:/var/tmp",
            "--bindmount_ro", "/dev",
            "--bindmount_ro", "/bin",
            "--bindmount_ro", "/etc/alternatives",
            "--bindmount_ro", "/etc/fonts",
            "--bindmount_ro", "/etc/passwd",
            "--bindmount_ro", "/lib",
            "--bindmount_ro", "/lib32",
            "--bindmount_ro", "/lib64",
            "--bindmount_ro", "/usr",
            "--bindmount_ro", "/proc",
            "--bindmount_ro", "/sys",
            "--bindmount_ro", str(self.config.compiler_base_path),
            "--bindmount_ro", str(self.config.library_base_path),
            "--env", "PATH=/usr/bin:/bin",
            "--cwd", "/tmp",
            # NOTE: "soft" resolves to a near-infinite RLIMIT_FSIZE in nsjail >=3.6,
            # which causes some of the compilers/tooling to fail with "File too large" (SIGXFSZ).
            # Use a large finite value instead.
            "--rlimit_fsize", "512",  # 512 MB
            "--rlimit_nofile", "soft",
        ]
        # fmt: on
        if self.config.sandbox_disable_proc:
            wrapper.append("--disable_proc")  # needed for running inside Docker

        # Informational nsjail logs would be mixed into compiler/objdump output.
        wrapper.append("--quiet" if self.config.debug else "--really_quiet")
        for mount in mounts:
            wrapper.extend(["--bindmount_ro", str(mount)])
        for key, value in env.items():
            wrapper.extend(["--env", f"{key}={value}"])

        wrapper.append("--")
        return wrapper

    def run_subprocess(
        self,
        args: str | list[str],
        *,
        mounts: list[Path] | None = None,
        env: dict[str, str] | None = None,
        shell: bool = False,
        timeout: float | None = None,
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
