from typing import Any, Optional

import django_filters

from rest_framework.pagination import CursorPagination
from rest_framework import mixins, filters, status
from rest_framework.viewsets import GenericViewSet
from rest_framework.response import Response
from rest_framework.request import Request
from rest_framework.exceptions import APIException
from rest_framework.routers import DefaultRouter
# from django.http import HttpResponseForbidden
# from ..models.scratch import Scratch
from ..models.comment import Comment
from ..models.github import GitHubUser
from ..serializers import CommentSerializer
from django.contrib.auth.models import User


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
    serializer_class = CommentSerializer

    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        user: Optional[User] = request.profile.user
        if not user:
            raise GithubLoginException()
        gh_user: Optional[GitHubUser] = user.github
        if not gh_user:
            raise GithubLoginException()

        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = serializer.save()

        return Response(
            CommentSerializer(comment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


router = DefaultRouter(trailing_slash=False)
router.register(r"comment", CommentViewSet)
