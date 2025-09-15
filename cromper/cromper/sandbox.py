import contextlib
import getpass
import logging
import os
import shlex
import subprocess
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)


class SandboxError(Exception):
    """Sandbox execution error."""

    pass


class Sandbox(contextlib.AbstractContextManager["Sandbox"]):
    def __init__(
        self,
        use_jail: bool = False,
        sandbox_tmp_path: Optional[Path] = None,
        sandbox_chroot_path: Optional[Path] = None,
        compiler_base_path: Optional[Path] = None,
        library_base_path: Optional[Path] = None,
        wineprefix: Optional[Path] = None,
        nsjail_bin_path: Optional[Path] = None,
        sandbox_disable_proc: bool = False,
        debug: bool = True,
    ):
        self.use_jail = use_jail
        self.sandbox_tmp_path = sandbox_tmp_path or Path("/tmp/sandbox")
        self.sandbox_chroot_path = sandbox_chroot_path or Path("/tmp/sandbox/root")
        self.compiler_base_path = compiler_base_path or Path("compilers")
        self.library_base_path = library_base_path or Path("libraries")
        self.wineprefix = wineprefix or Path("/tmp/wine")
        self.nsjail_bin_path = nsjail_bin_path or Path("/bin/nsjail")
        self.sandbox_disable_proc = sandbox_disable_proc
        self.debug = debug

    def __enter__(self) -> "Sandbox":
        tmpdir: Optional[str] = None
        if self.use_jail:
            # Only use sandbox_tmp_path if USE_SANDBOX_JAIL is enabled,
            # otherwise use the system default
            self.sandbox_tmp_path.mkdir(parents=True, exist_ok=True)
            tmpdir = str(self.sandbox_tmp_path)

        self.temp_dir = TemporaryDirectory(dir=tmpdir, ignore_cleanup_errors=True)
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

        self.sandbox_chroot_path.mkdir(parents=True, exist_ok=True)
        self.wineprefix.mkdir(parents=True, exist_ok=True)

        assert ":" not in str(self.path)
        assert ":" not in str(self.wineprefix)

        # wine-specific hacks
        user = getpass.getuser()
        (self.path / "Temp").mkdir(parents=True, exist_ok=True)

        # fmt: off
        wrapper = [
            str(self.nsjail_bin_path),
            "--mode", "o",
            "--chroot", str(self.sandbox_chroot_path),
            "--bindmount", f"{self.path}:/tmp",
            "--bindmount", f"{self.path}:/run/user/{os.getuid()}",
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
            "--bindmount", f"{self.path}:/var/tmp",
            "--bindmount_ro", str(self.compiler_base_path),
            "--bindmount_ro", str(self.library_base_path),
            "--env", "PATH=/usr/bin:/bin",
            "--cwd", "/tmp",
            "--rlimit_fsize", "soft",
            "--rlimit_nofile", "soft",
            # the following are settings that can be removed once we are done with wine
            "--bindmount_ro", f"{self.wineprefix}:/wine",
            "--bindmount", f"{self.path}/Temp:/wine/drive_c/users/{user}/Temp",
            "--env", "WINEDEBUG=-all",
            "--env", "WINEPREFIX=/wine",
        ]
        # fmt: on
        if self.sandbox_disable_proc:
            wrapper.append("--disable_proc")  # needed for running inside Docker

        if not self.debug:
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

        print("Running ", args)
        print("With env:", env)

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
