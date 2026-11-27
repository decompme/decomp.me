from collections.abc import Awaitable, Callable

from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.urls import Resolver404, resolve
from django.utils.decorators import async_only_middleware

# Route names cover DRF's format suffixes without duplicating URL rules.
_CROMPER_METHODS = {
    "scratch-list": {"POST"},
    "scratch-detail": {"PUT", "PATCH"},
    "scratch-compile": {"GET", "HEAD", "POST"},
    "scratch-decompile": {"POST"},
    "scratch-fork": {"POST"},
    "scratch-export": {"GET", "HEAD"},
}


def may_wait_for_cromper(request: HttpRequest) -> bool:
    try:
        match = resolve(request.path_info)
    except Resolver404:
        return False
    return request.method in _CROMPER_METHODS.get(match.url_name or "", set())


@async_only_middleware
def limit_cromper_requests(
    get_response: Callable[[HttpRequest], Awaitable[HttpResponse]],
) -> Callable[[HttpRequest], Awaitable[HttpResponse]]:
    """Reject excess Cromper workflows before session/profile database access."""
    limit = settings.CROMPER_REQUEST_LIMIT
    if limit < 1:
        raise ImproperlyConfigured("CROMPER_REQUEST_LIMIT must be at least 1")
    active = 0

    async def middleware(request: HttpRequest) -> HttpResponse:
        nonlocal active
        if not may_wait_for_cromper(request):
            return await get_response(request)

        # No await between the check and increment: admission is atomic on this loop.
        if active >= limit:
            return JsonResponse(
                {
                    "detail": "The compiler service is busy. Please try again in a moment.",
                    "code": "TooManyRequests",
                },
                status=429,
                headers={"Retry-After": "1", "Cache-Control": "no-store"},
            )

        active += 1
        try:
            return await get_response(request)
        finally:
            active -= 1

    return middleware
