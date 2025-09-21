import logging
from collections.abc import Callable
from functools import wraps
from typing import ParamSpec, TypeVar

from typing import Callable, Optional, TypeVar, ParamSpec
from rest_framework.response import Response

logger = logging.getLogger(__file__)

# Generic types for a view function
P = ParamSpec("P")
R = TypeVar("R", bound=Response)


def globally_cacheable(
    max_age: int = 60, stale_while_revalidate: int | None = None
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """
    Decorator to add Cache-Control headers for globally cacheable API responses.
    """

    def decorator(view_func: Callable[P, R]) -> Callable[P, R]:
        @wraps(view_func)
        def _wrapped_view(*args: P.args, **kwargs: P.kwargs) -> R:
            response: R = view_func(*args, **kwargs)
            request = next((arg for arg in args if hasattr(arg, "method")), None)
            if request and request.method not in ("GET", "HEAD", "OPTIONS"):
                return response

            # Build Cache-Control header
            directives = ["public", f"max-age={max_age}"]
            if stale_while_revalidate is not None:
                directives.append(f"stale-while-revalidate={stale_while_revalidate}")

            response["Cache-Control"] = ", ".join(directives)
            response["X-Globally-Cacheable"] = True

            return response

        return _wrapped_view

    return decorator
