import os
from pathlib import Path

from cromper import compilers, libraries, platforms


def env_flag(name: str, default: bool = False) -> bool:
    """Read a boolean environment variable using the common truthy values."""
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "on", "yes"}


class CromperConfig:
    """Configuration for cromper"""

    def __init__(self):
        # Server settings
        self.port = int(os.getenv("CROMPER_PORT", "8888"))
        self.debug = env_flag("CROMPER_DEBUG")

        # CPU settings
        self.num_processes = int(os.getenv("CROMPER_NUM_PROCESSES", "4"))
        self.num_threads = int(os.getenv("CROMPER_NUM_THREADS", "8"))

        # Sandbox settings
        self.use_sandbox_jail = env_flag("USE_SANDBOX_JAIL")
        self.sandbox_disable_proc = env_flag("SANDBOX_DISABLE_PROC")

        # Paths
        service_root = Path(__file__).resolve().parent.parent
        self.compiler_base_path = Path(
            os.getenv("COMPILER_BASE_PATH", str(service_root / "compilers"))
        )
        self.library_base_path = Path(
            os.getenv("LIBRARY_BASE_PATH", str(service_root / "libraries"))
        )
        self.sandbox_tmp_path = Path(os.getenv("SANDBOX_TMP_PATH", "/tmp/sandbox"))
        self.sandbox_chroot_path = Path(
            os.getenv("SANDBOX_CHROOT_PATH", "/sandbox/root")
        )
        self.nsjail_bin_path = Path(os.getenv("SANDBOX_NSJAIL_BIN_PATH", "/bin/nsjail"))

        # Timeouts
        self.compilation_timeout_seconds = int(
            os.getenv("COMPILATION_TIMEOUT_SECONDS", "10")
        )
        self.assembly_timeout_seconds = int(os.getenv("ASSEMBLY_TIMEOUT_SECONDS", "3"))
        self.objdump_timeout_seconds = int(os.getenv("OBJDUMP_TIMEOUT_SECONDS", "3"))

        # Set up the compiler and library base paths in the shared modules
        self.compilers_instance = compilers.Compilers(self.compiler_base_path)
        libraries.set_library_base_path(self.library_base_path)
        self.platforms_instance = platforms.Platforms()
