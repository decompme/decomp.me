from sqlite3 import IntegrityError
from typing import Any

from rest_framework.response import Response
from rest_framework.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from rest_framework.views import exception_handler


class AssemblyError(Exception):
    """Raised when the target assembly cannot be assembled by cromper."""

    code = "Assembler"

    def __init__(self, message: str):
        self.msg = message
        super().__init__(message)


def custom_exception_handler(exc: Exception, context: Any) -> Response | None:
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    if isinstance(exc, AssemblyError):
        response = Response(
            data={
                "code": exc.code,
                "detail": exc.msg,
            },
            status=HTTP_400_BAD_REQUEST,
        )
    elif isinstance(exc, (AssertionError, IntegrityError)):
        response = Response(
            data={
                "detail": str(exc),
            },
            status=HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if response is not None and isinstance(response.data, dict):
        response.data["kind"] = exc.__class__.__name__

    return response
