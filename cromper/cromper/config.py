import os

from pathlib import Path

from cromper import compilers, libraries, platforms


class CromperConfig:
    """Configuration for the cromper service."""

    def __init__(self):
        # Server settings
        self.port = int(os.getenv("CROMPER_PORT", "8888"))
        self.debug = os.getenv("CROMPER_DEBUG", "false").lower() == "true"

        # CPU settings
        self.num_processes = int(os.getenv("CROMPER_NUM_PROCESSES", "4"))
        self.num_threads = int(os.getenv("CROMPER_NUM_THREADS", "8"))

        # Sandbox settings
        self.use_sandbox_jail = os.getenv("USE_SANDBOX_JAIL", "false").lower() in (
            "true",
            "on",
            "1",
        )
        self.sandbox_disable_proc = os.getenv(
            "SANDBOX_DISABLE_PROC", "false"
        ).lower() in ("true", "on", "1")

        # Paths
        self.compiler_base_path = Path(
            os.getenv("COMPILER_BASE_PATH", "/cromper/compilers")
        )
        self.library_base_path = Path(
            os.getenv("LIBRARY_BASE_PATH", "/cromper/libraries")
        )
        self.sandbox_tmp_path = Path(os.getenv("SANDBOX_TMP_PATH", "/tmp/sandbox"))
        self.sandbox_chroot_path = Path(
            os.getenv("SANDBOX_CHROOT_PATH", "/tmp/sandbox/root")
        )
        self.wineprefix = Path(os.getenv("WINEPREFIX", "/tmp/wine"))
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
