from django.contrib.auth import logout
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .scratch import ScratchPagination
from ..middleware import Request
from ..models import Profile, Scratch
from ..serializers import serialize_profile, TerseScratchSerializer
from ..github import GitHubUser

class CurrentUser(APIView):
    """
    View to access the current user profile.
    """

    def get(self, request: Request):
        user = serialize_profile(request, request.profile)
        return Response(user)

    def post(self, request: Request):
        """
        Login if the 'code' parameter is provided. Log out otherwise.
        """

        if "code" in request.data:
            GitHubUser.login(request, request.data["code"])
            assert not request.profile.is_anonymous()
            return self.get(request)
        else:
            logout(request)

            profile = Profile()
            profile.save()
            request.profile = profile
            request.session["profile_id"] = request.profile.id

            return self.get(request)


class CurrentUserScratchList(generics.ListAPIView):
    """
    Gets the current user's scratches
    """

    pagination_class = ScratchPagination
    serializer_class = TerseScratchSerializer

    def get_queryset(self):
        return Scratch.objects.filter(owner=self.request.profile)


class UserScratchList(generics.ListAPIView):
    """
    Gets a user's scratches
    """

    pagination_class = ScratchPagination
    serializer_class = TerseScratchSerializer

    def get_queryset(self):
        return Scratch.objects.filter(owner__user__username=self.kwargs["username"])


@api_view(["GET"])
def user(request, username):
    """
    Gets a user's basic data
    """

    return Response(serialize_profile(request, get_object_or_404(Profile, user__username=username)))
