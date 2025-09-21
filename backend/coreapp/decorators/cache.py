from functools import wraps
import logging

from typing import Callable, Any, Optional, TypeVar, ParamSpec
from rest_framework.response import Response

logger = logging.getLogger(__file__)

# Generic types for a view function
P = ParamSpec("P")
R = TypeVar("R", bound=Response)


def globally_cacheable(
    max_age: int = 60, stale_while_revalidate: Optional[int] = None
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """
    Decorator to add Cache-Control headers for globally cacheable API responses.
    """

    def decorator(view_func: Callable[P, R]) -> Callable[P, R]:
        @wraps(view_func)
        def _wrapped_view(*args: P.args, **kwargs: P.kwargs) -> R:
            # First argument is typically request
            request: Any = args[0] if args else None
            response: R = view_func(*args, **kwargs)

            # Build Cache-Control header
            directives = ["public", f"max-age={max_age}"]
            if stale_while_revalidate is not None:
                directives.append(f"stale-while-revalidate={stale_while_revalidate}")

            response["Cache-Control"] = ", ".join(directives)
            response["X-Globally-Cacheable"] = True

            return response

        return _wrapped_view

    return decorator
