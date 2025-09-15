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
