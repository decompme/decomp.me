from sqlite3 import IntegrityError
from typing import Any

from rest_framework.response import Response
from rest_framework.status import (
    HTTP_400_BAD_REQUEST,
    HTTP_500_INTERNAL_SERVER_ERROR,
)
from rest_framework.views import exception_handler


class ServiceError(Exception):
    """An exception that should be rendered as a JSON response.

    Subclasses set ``status_code``/``code`` to control the HTTP response, and
    may set ``public_message`` to expose a user-friendly message while keeping
    the raw error text (``msg``) for logs.
    """

    status_code: int = HTTP_500_INTERNAL_SERVER_ERROR
    code: str | None = None
    public_message: str | None = None

    def __init__(self, message: str):
        self.msg = message
        super().__init__(message)

    @property
    def detail(self) -> str:
        return self.public_message or self.msg


class AssemblyError(ServiceError):
    """Raised when the target assembly cannot be assembled by cromper."""

    status_code = HTTP_400_BAD_REQUEST
    code = "Assembler"


def custom_exception_handler(exc: Exception, context: Any) -> Response | None:
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    if isinstance(exc, ServiceError):
        data: dict[str, Any] = {"detail": exc.detail}
        if exc.code is not None:
            data["code"] = exc.code
        response = Response(data=data, status=exc.status_code)
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
