from typing import Any, Optional

import django_filters
from rest_framework.pagination import CursorPagination
from rest_framework import mixins, filters, status
from rest_framework.viewsets import GenericViewSet
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.exceptions import APIException
# from django.http import HttpResponseForbidden
# from ..models.scratch import Scratch
from ..models.comment import Comment
from django.contrib.auth.models import User

from ..models.github import GitHubUser


class GithubLoginException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You must be logged in to Github to perform this action."


class CommentPagination(CursorPagination):
    ordering = "-creation_time"
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100


class CommentViewSet(
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.ListModelMixin,
    GenericViewSet,  # type: ignore
):
    queryset = Comment.objects.all()
    pagination_class = CommentPagination
    filterset_fields = ["scratch"]
    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        filters.SearchFilter,
    ]

    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        user: Optional[User] = request.profile.user
        if not user:
            raise GithubLoginException()
        gh_user: Optional[GitHubUser] = user.github
        if not gh_user:
            raise GithubLoginException()

        serializer = ProjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        slug = serializer.validated_data["slug"]
        if slug == "new" or Project.objects.filter(slug=slug).exists():
            raise ProjectExistsException()

        project = serializer.save()

        ProjectMember(project=project, user=request.profile.user).save()

        return Response(
            ProjectSerializer(project, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
