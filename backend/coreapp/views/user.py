import django_filters
from django.contrib.auth import logout
from django.db.models.query import QuerySet
from django.shortcuts import get_object_or_404
from rest_framework import generics, filters
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from ..middleware import Request
from ..models.github import GitHubUser
from ..models.profile import Profile
from ..models.scratch import Scratch
from ..serializers import TerseScratchSerializer, serialize_profile
from .scratch import ScratchPagination


class CurrentUser(APIView):
    """
    View to access the current user profile.
    """

    def get(self, request: Request) -> Response:
        user = serialize_profile(request.profile)
        return Response(user)

    def post(self, request: Request) -> Response:
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


class CurrentUserScratchList(generics.ListAPIView):  # type: ignore
    """
    Gets the current user's scratches
    """

    pagination_class = ScratchPagination
    serializer_class = TerseScratchSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["creation_time", "last_updated", "score"]

    def get_queryset(self) -> QuerySet[Scratch]:
        return Scratch.objects.filter(owner=self.request.profile)


class UserScratchList(generics.ListAPIView):  # type: ignore
    """
    Gets a user's scratches
    """

    pagination_class = ScratchPagination
    serializer_class = TerseScratchSerializer
    filterset_fields = ["preset"]
    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        filters.OrderingFilter,
    ]
    ordering_fields = ["creation_time", "last_updated", "score"]

    def get_queryset(self) -> QuerySet[Scratch]:
        return Scratch.objects.filter(owner__user__username=self.kwargs["username"])


@api_view(["GET"])  # type: ignore
def user(request: Request, username: str) -> Response:
    """
    Gets a user's basic data
    """

    return Response(
        serialize_profile(get_object_or_404(Profile, user__username=username))
    )
