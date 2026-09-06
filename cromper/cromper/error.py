import subprocess


class CompilationError(Exception):
    """Exception raised when compilation fails."""

    pass


class AssemblyError(Exception):
    """Exception raised when assembly fails."""

    @staticmethod
    def from_process_error(e: subprocess.CalledProcessError) -> "AssemblyError":
        """Create an AssemblyError from a subprocess.CalledProcessError."""
        return AssemblyError(f"Assembly failed: {e.stdout}")


class SandboxError(Exception):
    """Exception raised when sandbox execution fails."""

    pass


class DiffError(Exception):
    """Exception raised when diff generation fails."""

    pass


class NmError(Exception):
    """Exception raised when nm command fails."""

    @staticmethod
    def from_process_error(e: subprocess.CalledProcessError) -> "NmError":
        """Create an NmError from a subprocess.CalledProcessError."""
        return NmError(f"nm failed: {e.stdout}")


class ObjdumpError(Exception):
    """Exception raised when objdump command fails."""

    @staticmethod
    def from_process_error(e: subprocess.CalledProcessError) -> "ObjdumpError":
        """Create an ObjdumpError from a subprocess.CalledProcessError."""
        return ObjdumpError(f"objdump failed: {e.stdout}")


class M2CError(Exception):
    """Exception raised when m2c decompilation fails."""

    pass
