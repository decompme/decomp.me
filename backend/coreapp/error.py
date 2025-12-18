from sqlite3 import IntegrityError
from typing import Any

from rest_framework.response import Response
from rest_framework.status import HTTP_500_INTERNAL_SERVER_ERROR
from rest_framework.views import exception_handler


def custom_exception_handler(exc: Exception, context: Any) -> Response | None:
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    if isinstance(exc, AssertionError) or isinstance(exc, IntegrityError):
        response = Response(
            data={
                "detail": str(exc),
            },
            status=HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if response is not None and isinstance(response.data, dict):
        response.data["kind"] = exc.__class__.__name__

    return response
