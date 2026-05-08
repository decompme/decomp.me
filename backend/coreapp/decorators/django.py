# This file wraps common django decorators in method_decorator for use with the APIView class

from collections.abc import Callable
from datetime import datetime

from django.utils.decorators import method_decorator
from rest_framework.response import Response


def condition(
    etag_func: Callable[..., str | None] | None = None,
    last_modified_func: Callable[..., datetime | None] | None = None,
) -> Callable[..., Callable[..., Response]]:
    """
    Handle Last-Modified and ETag headers.
    """
    from django.views.decorators.http import condition

    return method_decorator(condition(etag_func, last_modified_func))
