from django.http.request import HttpRequest
from django.utils.timezone import now
from django.contrib import auth

from .models import User, Profile
import logging
from rest_framework.request import Request as DRFRequest
from typing import Union, TYPE_CHECKING

if TYPE_CHECKING:
    from .github import GitHubUser

class AnonymousUser(auth.models.AnonymousUser):
    profile: Profile

class Request(DRFRequest):
    user: Union[User, AnonymousUser]

def disable_csrf(get_response):
    def middleware(request: HttpRequest):
        setattr(request, "_dont_enforce_csrf_checks", True)
        return get_response(request)

    return middleware

def set_user_profile(get_response):
    """
    Makes sure that `request.user.profile` is always available, even for anonymous users.
    """

    def middleware(request: HttpRequest):
        profile = None

        if not request.user.is_anonymous:
            try:
                profile = request.user.profile
            except User.profile.RelatedObjectDoesNotExist: # type: ignore
                pass

        if not profile:
            id = request.session.get("anonymous_profile_id")
            if not isinstance(id, int):
                id = -1

            try:
                profile = Profile.objects.get(id=id)
            except Profile.DoesNotExist:
                profile = Profile()

                if not request.user.is_anonymous:
                    profile.user = request.user

                profile.save()
                request.session["anonymous_profile_id"] = profile.id
                logging.debug(f"New anonymous profile: {profile}")

        profile.last_request_date = now()
        profile.save()

        return get_response(request)
    
    return middleware
