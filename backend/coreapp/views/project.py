import logging
from threading import Thread
from typing import Any

import django_filters
from django.db.models.query import QuerySet
from django.views import View
from rest_framework import filters, mixins, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework_extensions.routers import ExtendedSimpleRouter

from coreapp.middleware import Request

from ..models.github import GitHubRepo, GitHubRepoBusyException
from ..models.project import Project, ProjectFunction

from ..models.scratch import Scratch
from ..serializers import (
    ProjectFunctionSerializer,
    ProjectSerializer,
    ScratchSerializer,
    TerseScratchSerializer,
)

logger = logging.getLogger(__name__)


class NotProjectMaintainer(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You must be a project maintainer to perform this action."


class ProjectPagination(CursorPagination):
    ordering = "-creation_time"
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class ProjectFunctionPagination(CursorPagination):
    ordering = "-creation_time"
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class IsProjectMemberOrReadOnly(permissions.BasePermission):
    def has_permission(self, request: Any, view: View) -> bool:
        return True

    def has_object_permission(self, request: Any, view: View, obj: Any) -> bool:
        assert isinstance(obj, Project)
        return request.method in permissions.SAFE_METHODS or obj.is_member(
            request.profile
        )


class ProjectViewSet(
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    GenericViewSet,
):
    queryset = Project.objects.all()
    pagination_class = ProjectPagination
    serializer_class = ProjectSerializer
    permission_classes = [IsProjectMemberOrReadOnly]

    @action(detail=True, methods=["POST"])
    def pull(self, request: Request, pk: str) -> Response:
        project: Project = self.get_object()
        repo: GitHubRepo = project.repo

        if not project.is_member(request.profile):
            raise NotProjectMaintainer()

        if not repo.is_pulling:
            t = Thread(target=GitHubRepo.pull, args=(project.repo,))
            t.start()

        repo.is_pulling = True  # Respond with is_pulling=True; the thread will save is_pulling=True to the DB
        return Response(
            ProjectSerializer(project, context={"request": request}).data,
            status=status.HTTP_202_ACCEPTED,
        )


class ProjectFunctionViewSet(
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    GenericViewSet,
):
    pagination_class = ProjectFunctionPagination
    serializer_class = ProjectFunctionSerializer

    filter_fields = ["rom_address", "is_matched_in_repo"]
    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        filters.SearchFilter,
    ]
    search_fields = ["display_name"]

    def get_queryset(self) -> QuerySet[ProjectFunction]:
        return ProjectFunction.objects.filter(project=self.kwargs["parent_lookup_slug"])

    @action(detail=True, methods=["GET", "POST"])
    def attempts(self, request: Request, **kwargs: Any) -> Response:
        fn: ProjectFunction = self.get_object()
        project: Project = fn.project
        repo: GitHubRepo = project.repo

        if request.method == "GET":
            attempts = Scratch.objects.filter(project_function=fn).order_by(
                "-last_updated"
            )
            return Response(
                TerseScratchSerializer(
                    attempts, many=True, context={"request": request}
                ).data
            )
        elif request.method == "POST":
            if repo.is_pulling:
                raise GitHubRepoBusyException()

            scratch = fn.create_scratch()
            if scratch.is_claimable():
                scratch.owner = request.profile
                scratch.save()

            return Response(
                ScratchSerializer(scratch, context={"request": request}).data,
                status=status.HTTP_201_CREATED,
            )
        else:
            raise Exception("Unsupported method")


router = ExtendedSimpleRouter(trailing_slash=False)
(
    router.register(r"projects", ProjectViewSet).register(
        r"functions",
        ProjectFunctionViewSet,
        basename="projectfunction",
        parents_query_lookups=["slug"],
    )
)
