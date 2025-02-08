import logging
from typing import Callable, Optional, TYPE_CHECKING, Union

from django.contrib import auth
from django.contrib.auth.models import User
from django.http.request import HttpRequest
from django.utils.timezone import now
from rest_framework.request import Request as DRFRequest
from rest_framework.response import Response

from .models.profile import Profile

if TYPE_CHECKING:
    from .models.github import GitHubUser


class AnonymousUser(auth.models.AnonymousUser):
    profile: Profile


if TYPE_CHECKING:

    class Request(DRFRequest):
        user: Union[User, AnonymousUser]
        profile: Profile

else:
    Request = DRFRequest


def disable_csrf(
    get_response: Callable[[HttpRequest], Response]
) -> Callable[[HttpRequest], Response]:
    def middleware(request: HttpRequest) -> Response:
        setattr(request, "_dont_enforce_csrf_checks", True)
        return get_response(request)

    return middleware


def set_user_profile(
    get_response: Callable[[HttpRequest], Response]
) -> Callable[[Request], Response]:
    """
    Makes sure that `request.profile` is always available, even for anonymous users.
    """

    def middleware(request: Request) -> Response:
        user_agent = request.headers.get("User-Agent")

        # Skip if the request is from SSR
        if user_agent and (
            "node" in user_agent
            or "undici" in user_agent
            or "Next.js Middleware" in user_agent
            or "python-requests" in user_agent
            or "YandexRenderResourcesBot" in user_agent
        ):
            request.profile = Profile()
            return get_response(request)

        profile: Optional[Profile] = None

        # Use the user's profile if they're logged in
        if not request.user.is_anonymous:
            profile = Profile.objects.filter(user=request.user).first()

        # Otherwise, use their session profile
        if not profile:
            id = request.session.get("profile_id")

            if isinstance(id, int):
                profile = Profile.objects.filter(id=id).first()
                if profile is not None:
                    profile_user = User.objects.filter(profile=profile).first()

                    if profile_user and request.user.is_anonymous:
                        request.user = profile_user

        # If we still don't have a profile, create a new one
        if not profile:
            profile = Profile()

            # And attach it to the logged-in user, if there is one
            if not request.user.is_anonymous:
                assert Profile.objects.filter(user=request.user).first() is None
                profile.user = request.user

            profile.save()
            request.session["profile_id"] = profile.id
            logging.debug(f"Made new profile: {profile}")

        if profile.user is None and not request.user.is_anonymous:
            profile.user = request.user

        profile.last_request_date = now()
        profile.save()

        request.profile = profile

        return get_response(request)

    return middleware
