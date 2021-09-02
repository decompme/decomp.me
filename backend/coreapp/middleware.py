from django.http.request import HttpRequest
from django.utils.timezone import now

from .models import User, Profile
import logging

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
            except User.profile.RelatedObjectDoesNotExist:
                pass

        if not profile:
            try:
                profile = Profile.objects.get(id=request.session.get("anonymous_profile_id"))
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
