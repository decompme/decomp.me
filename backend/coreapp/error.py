from sqlite3 import IntegrityError
from subprocess import CalledProcessError
from typing import Any, ClassVar, Optional

from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_500_INTERNAL_SERVER_ERROR

from rest_framework.views import exception_handler


def custom_exception_handler(exc: Exception, context: Any) -> Optional[Response]:
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
    elif isinstance(exc, AssertionError) or isinstance(exc, IntegrityError):
        response = Response(
            data={
                "detail": str(exc),
            },
            status=HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if response is not None and isinstance(response.data, dict):
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
        error.msg = ex.stdout
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
        for line in ex.stdout.splitlines():
            if "asm.s:" in line:
                error_lines.append(line[line.find("asm.s:") + len("asm.s:") :].strip())
            else:
                error_lines.append(line)
        error.msg = "\n".join(error_lines)

        return error
