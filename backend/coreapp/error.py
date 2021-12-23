from typing import ClassVar

from subprocess import CalledProcessError


class SubprocessError(Exception):
    SUBPROCESS_NAME: ClassVar[str] = "Subprocess"
    stdout: str
    stderr: str

    def __init__(self, message: str):
        super().__init__(f"{self.SUBPROCESS_NAME} error: {message}")
        self.stdout = ""
        self.stderr = ""

    @staticmethod
    def from_process_error(ex: CalledProcessError) -> "SubprocessError":
        error = SubprocessError(f"{ex.cmd[0]} returned {ex.returncode}")
        error.stdout = ex.stdout
        error.stderr = ex.stderr
        return error

class DiffError(SubprocessError):
    SUBPROCESS_NAME: ClassVar[str] = "Diff"

class ObjdumpError(SubprocessError):
    SUBPROCESS_NAME: ClassVar[str] = "Objdump"

class NmError(SubprocessError):
    SUBPROCESS_NAME: ClassVar[str] = "Nm"

class CompilationError(SubprocessError):
    SUBPROCESS_NAME: ClassVar[str] = "Compiler"

class AssemblyError(SubprocessError):
    SUBPROCESS_NAME: ClassVar[str] = "Compiler"
