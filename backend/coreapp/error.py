from subprocess import CalledProcessError
from typing import ClassVar

from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST

from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    if isinstance(exc, SubprocessError):
        response = Response(
            data={
                "code": exc.SUBPROCESS_NAME,
                "detail": exc.msg,
            },
            status=HTTP_400_BAD_REQUEST,
        )

    if response is not None:
        response.data["kind"] = exc.__class__.__name__

    return response


class SubprocessError(Exception):
    SUBPROCESS_NAME: ClassVar[str] = "Subprocess"
    msg: str
    stdout: str
    stderr: str

    def __init__(self, message: str):
        self.msg = f"{self.SUBPROCESS_NAME} error: {message}"

        super().__init__(self.msg)
        self.stdout = ""
        self.stderr = ""

    @staticmethod
    def from_process_error(ex: CalledProcessError) -> "SubprocessError":
        error = SubprocessError(f"{ex.cmd[0]} returned {ex.returncode}")
        error.stdout = ex.stdout
        error.stderr = ex.stderr
        error.msg = ex.stderr
        return error


class DiffError(SubprocessError):
    SUBPROCESS_NAME: ClassVar[str] = "Diff"


class ObjdumpError(SubprocessError):
    SUBPROCESS_NAME: ClassVar[str] = "objdump"


class NmError(SubprocessError):
    SUBPROCESS_NAME: ClassVar[str] = "nm"


class CompilationError(SubprocessError):
    SUBPROCESS_NAME: ClassVar[str] = "Compiler"


class SandboxError(SubprocessError):
    SUBPROCESS_NAME: ClassVar[str] = "Sandbox"


class AssemblyError(SubprocessError):
    SUBPROCESS_NAME: ClassVar[str] = "Compiler"

    @staticmethod
    def from_process_error(ex: CalledProcessError) -> "SubprocessError":
        error = super(AssemblyError, AssemblyError).from_process_error(ex)

        error_lines = []
        for line in ex.stderr.splitlines():
            if "asm.s:" in line:
                error_lines.append(line[line.find("asm.s:") + len("asm.s:") :].strip())
            else:
                error_lines.append(line)
        error.msg = "\n".join(error_lines)

        return error
