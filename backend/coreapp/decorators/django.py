# This file wraps common django decorators in method_decorator for use with the APIView class

from datetime import datetime

from typing import Callable, Optional

from django.utils.decorators import method_decorator
from rest_framework.response import Response


def condition(
    etag_func: Optional[Callable[..., Optional[str]]] = None,
    last_modified_func: Optional[Callable[..., Optional[datetime]]] = None,
) -> Callable[..., Callable[..., Response]]:
    """
    Handle Last-Modified and ETag headers.
    """
    from django.views.decorators.http import condition

    return method_decorator(condition(etag_func, last_modified_func))
