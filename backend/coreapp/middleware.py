import logging
import re
from typing import Callable, TYPE_CHECKING, Union

from django.contrib import auth
from django.contrib.auth.models import User
from django.http.request import HttpRequest
from django.utils.timezone import now
from rest_framework.request import Request as DRFRequest
from rest_framework.response import Response

from .models.profile import Profile

logger = logging.getLogger(__name__)

if TYPE_CHECKING:
    pass


class AnonymousUser(auth.models.AnonymousUser):
    profile: Profile


if TYPE_CHECKING:

    class Request(DRFRequest):
        user: Union[User, AnonymousUser]
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


def request_needs_profile(req: Request):
    methods_paths = [
        ("GET", "^/api/user$"),  # FIXME: tests break without this
        ("GET", "^/api/user/scratches$"),  # FIXME: tests break without this
        ("POST", "^/api/scratch$"),
        ("POST", r"^/api/scratch/[A-Za-z0-9]+/fork$"),
        ("POST", r"^/api/scratch/[A-Za-z0-9]+/claim$"),
        ("POST", "^/api/preset$"),
    ]
    for method, path in methods_paths:
        if req.method == method and re.match(path, req.path):
            return True

    return False


def set_user_profile(
    get_response: Callable[[HttpRequest], Response],
) -> Callable[[Request], Response]:
    """
    Makes sure that `request.profile` is always available, even for anonymous users.
    """

    def middleware(request: Request) -> Response:
        user_agent = request.headers.get("User-Agent", "")
        x_forwarded_for = request.headers.get("X-Forwarded-For", "n/a")

        bot_signatures = [
            "node",
            "undici",
            "Next.js Middleware",
            "python-requests",
            "curl",
            "YandexRenderResourcesBot",
            "SentryUptimeBot",
        ]

        # Avoid creating profiles for SSR or bots
        if not user_agent or any(bot in user_agent for bot in bot_signatures):
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

        # Create a new profile if endpoint requires one
        if not profile and request_needs_profile(request):
            profile = Profile(
                user=request.user if request.user.is_authenticated else None
            )
            profile.save()
            request.session["profile_id"] = profile.id

            # Log profile creation to protect against misconfiguration or abuse
            logger.warning(
                "Made new profile: User-Agent: %s, IP: %s, name: %s, request path: %s",
                user_agent,
                x_forwarded_for,
                profile,
                request.path,
            )

        if profile:
            # Update last seen timestamp if more than a minute since last updated
            last_request_date = profile.last_request_date
            profile.last_request_date = now()
            if (profile.last_request_date - last_request_date).total_seconds() > 60:
                profile.save(update_fields=["last_request_date"])

        else:
            # Create a profile but do not save it to the database
            profile = Profile()
            logger.info(
                "Made transient profile: %s, User-Agent: %s, IP: %s, Endpoint: %s",
                profile,
                user_agent,
                x_forwarded_for,
                request.path,
            )

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
