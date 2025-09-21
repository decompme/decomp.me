import logging
from typing import Callable, TYPE_CHECKING, Union

from django.contrib import auth
from django.contrib.auth.models import User
from django.http.request import HttpRequest
from django.utils.timezone import now
from rest_framework.request import Request as DRFRequest
from rest_framework.response import Response

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


def disable_csrf(
    get_response: Callable[[HttpRequest], Response],
) -> Callable[[HttpRequest], Response]:
    def middleware(request: HttpRequest) -> Response:
        setattr(request, "_dont_enforce_csrf_checks", True)
        return get_response(request)

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


def set_user_profile(
    get_response: Callable[[HttpRequest], Response],
) -> Callable[[Request], Response]:
    """
    Makes sure that `request.profile` is always available, even for anonymous users.
    """

    def middleware(request: Request) -> Response:
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
            request.profile = Profile()
            return get_response(request)

        # Avoid creating persistent profiles on anonymous requests
        if is_ephemeral_profile_request(request):
            request.profile = Profile()
            return get_response(request)

        # Avoid creating persistent profiles on HEAD or OPTIONS requests
        if request.method in ("HEAD", "OPTIONS"):
            request.profile = Profile()
            return get_response(request)

        profile = None

        # Try user-linked profile
        if request.user.is_authenticated:
            profile = getattr(request.user, "profile", None)

        # Try session-based profile
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
            request.profile = Profile()
            return get_response(request)

        # Create new profile if none found
        if not profile:
            profile = Profile(
                user=request.user if request.user.is_authenticated else None
            )

            profile.save()
            request.session["profile_id"] = profile.id

            # More info to help identify why we are creating so many profiles...
            x_forwarded_for = request.headers.get("X-Forwarded-For", "n/a")
            logger.debug(
                "Made new profile: User-Agent: %s, IP: %s, name: %s, request path: %s",
                user_agent,
                x_forwarded_for,
                profile,
                request.path,
            )

        # Update last seen timestamp if more than a minute since last updated
        last_request_date = profile.last_request_date
        profile.last_request_date = now()
        if (profile.last_request_date - last_request_date).total_seconds() > 60:
            profile.save(update_fields=["last_request_date"])

        request.profile = profile

        return get_response(request)

    return middleware


def strip_cookie_vary(
    get_response: Callable[[HttpRequest], Response],
) -> Callable[[Request], Response]:
    def middleware(request: Request) -> Response:
        response = get_response(request)
        if response.headers.pop("X-Globally-Cacheable", False):
            if "Vary" in response.headers:
                vary_headers = [h.strip() for h in response.headers["Vary"].split(",")]
                vary_headers = [h for h in vary_headers if h.lower() != "cookie"]
                if vary_headers:
                    response.headers["Vary"] = ", ".join(vary_headers)
                else:
                    del response.headers["Vary"]
        return response

    return middleware


def strip_session(
    get_response: Callable[[HttpRequest], Response],
) -> Callable[[Request], Response]:
    def middleware(request: Request) -> Response:
        response = get_response(request)
        if is_public_get_request(request):
            response.cookies.clear()
        return response

    return middleware
