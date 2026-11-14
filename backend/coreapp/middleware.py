import logging
import re
from collections.abc import Awaitable, Callable
from typing import TYPE_CHECKING, Any

from asgiref.sync import sync_to_async
from django.contrib import auth
from django.contrib.auth.models import User
from django.http import HttpResponse
from django.utils.timezone import now
from rest_framework.request import Request as DRFRequest

from .models.profile import Profile

logger = logging.getLogger(__name__)


class AnonymousUser(auth.models.AnonymousUser):
    profile: Profile


if TYPE_CHECKING:

    class Request(DRFRequest):
        user: User | AnonymousUser
        profile: Profile

else:
    Request = DRFRequest


def async_only_middleware[T: Callable[..., Any]](factory: T) -> T:
    factory.sync_capable = False  # type: ignore[attr-defined]
    factory.async_capable = True  # type: ignore[attr-defined]
    return factory


@async_only_middleware
def disable_csrf(
    get_response: Callable[[Request], Awaitable[HttpResponse]],
) -> Callable[[Request], Awaitable[HttpResponse]]:
    async def middleware(request: Request) -> HttpResponse:
        request._dont_enforce_csrf_checks = True  # type: ignore[attr-defined]
        return await get_response(request)

    return middleware


def is_public_get_request(req: Request) -> bool:
    public_paths = [
        "/api/compiler",
        "/api/healthz$",
        "/api/library",
        "/api/platform",
        "/api/preset",
        "/api/scratch-count$",
        "/api/scratch/[A-Za-z0-9]+/compile$",
        "/api/scratch/[A-Za-z0-9]+/export$",
        "/api/scratch/[A-Za-z0-9]+/family$",
        "/api/scratch/[A-Za-z0-9]+$",
        "/api/scratch$",
        "/api/search$",
        "/api/stats$",
        "/api/users",
    ]
    for path in public_paths:
        if req.method == "GET" and re.match(path, req.path):
            return True

    return False


def is_ephemeral_profile_request(req: Request) -> bool:
    return (
        req.method in ("GET", "HEAD")
        and req.path == "/api/user"
        and "sessionid" not in req.COOKIES
    )


def resolve_profile(request: Request) -> Profile:
    """Resolve the profile in a sync thread for session and ORM access."""
    user_agent = request.headers.get("User-Agent", "")
    bot_signatures = [
        "node",
        "undici",
        "Next.js Middleware",
        "python-requests",
        "curl",
        "YandexRenderResourcesBot",
        "SentryUptimeBot",
        "Discord",
        "Wget",
    ]

    # Avoid creating persistent profiles for SSR or bots
    if not user_agent or any(bot in user_agent for bot in bot_signatures):
        return Profile()

    # Avoid creating persistent profiles on anonymous requests
    if is_ephemeral_profile_request(request):
        return Profile()

    if request.method in ("HEAD", "OPTIONS"):
        return Profile()

    profile = None

    if request.user.is_authenticated:
        profile = getattr(request.user, "profile", None)

    if not profile:
        profile_id = request.session.get("profile_id")
        if isinstance(profile_id, int):
            profile = (
                Profile.objects.select_related("user").filter(id=profile_id).first()
            )

            if profile and profile.user and request.user.is_anonymous:
                request.user = profile.user

    # Avoid creating persistent profiles for public endpoints
    if not profile and is_public_get_request(request):
        return Profile()

    if not profile:
        profile = Profile(user=request.user if request.user.is_authenticated else None)

        profile.save()
        request.session["profile_id"] = profile.id

        x_forwarded_for = request.headers.get("X-Forwarded-For", "n/a")
        logger.debug(
            "Made new profile: User-Agent: %s, IP: %s, name: %s, request path: %s",
            user_agent,
            x_forwarded_for,
            profile,
            request.path,
        )

    last_request_date = profile.last_request_date
    profile.last_request_date = now()
    if (profile.last_request_date - last_request_date).total_seconds() > 60:
        profile.save(update_fields=["last_request_date"])

    return profile


@async_only_middleware
def set_user_profile(
    get_response: Callable[[Request], Awaitable[HttpResponse]],
) -> Callable[[Request], Awaitable[HttpResponse]]:
    """
    Makes sure that `request.profile` is always available, even for anonymous users.
    """

    async def middleware(request: Request) -> HttpResponse:
        request.profile = await sync_to_async(resolve_profile)(request)
        return await get_response(request)

    return middleware


@async_only_middleware
def strip_cookie_vary(
    get_response: Callable[[Request], Awaitable[HttpResponse]],
) -> Callable[[Request], Awaitable[HttpResponse]]:
    async def middleware(request: Request) -> HttpResponse:
        response = await get_response(request)
        if (
            response.headers.pop("X-Globally-Cacheable", False)
            and "Vary" in response.headers
        ):
            vary_headers = [h.strip() for h in response.headers["Vary"].split(",")]
            vary_headers = [h for h in vary_headers if h.lower() != "cookie"]
            if vary_headers:
                response.headers["Vary"] = ", ".join(vary_headers)
            else:
                del response.headers["Vary"]
        return response

    return middleware


@async_only_middleware
def strip_session(
    get_response: Callable[[Request], Awaitable[HttpResponse]],
) -> Callable[[Request], Awaitable[HttpResponse]]:
    async def middleware(request: Request) -> HttpResponse:
        response = await get_response(request)
        if is_public_get_request(request):
            response.cookies.clear()
        return response

    return middleware
