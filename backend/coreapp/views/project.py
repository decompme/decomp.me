import logging
import random
import string
from typing import Any, Optional

from django.contrib.auth.models import User
from django.db.models.query import QuerySet
from django.db.utils import IntegrityError
from django.views import View
from rest_framework import mixins, permissions, status
from rest_framework.exceptions import APIException
from rest_framework.pagination import CursorPagination
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer
from rest_framework.viewsets import GenericViewSet
from rest_framework_extensions.routers import ExtendedSimpleRouter

from ..models.github import GitHubUser
from ..models.project import Project, ProjectMember
from ..serializers import ProjectMemberSerializer, ProjectSerializer

logger = logging.getLogger(__name__)


class NotProjectMaintainer(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You must be a project maintainer to perform this action."


class GithubLoginException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You must be logged in to Github to perform this action."


class PrMustHaveScratchesException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You must provide at least one scratch to create a PR."


class ProjectExistsException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Project with this name already exists."


class ProjectMustHaveMembersException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You must have at least one member in your project."


class ProjectMemberExists(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "User is already a member of this project."


class TemporaryProjectCreationStaffOnlyException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = (
        "Project creation is currently experimental and limited to admins only."
    )


class ProjectPagination(CursorPagination):
    ordering = "-creation_time"
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class IsProjectMemberOrReadOnly(permissions.BasePermission):
    def has_permission(self, request: Any, view: View) -> bool:
        return True

    def has_object_permission(self, request: Any, view: View, obj: Any) -> bool:
        if isinstance(obj, Project):
            project = obj
        elif isinstance(obj, ProjectMember):
            project = obj.project
        else:
            raise ValueError("Object must be a Project or ProjectMember")

        return request.method in permissions.SAFE_METHODS or project.is_member(
            request.profile
        )


def generate_branch_name() -> str:
    suffix = "".join(
        random.choice(string.ascii_lowercase + string.digits) for _ in range(5)
    )
    return f"decompme_GEN_{suffix}"


class ProjectViewSet(
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.UpdateModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    GenericViewSet,  # type: ignore
):
    queryset = Project.objects.all()
    pagination_class = ProjectPagination
    serializer_class = ProjectSerializer
    permission_classes = [IsProjectMemberOrReadOnly]
    parser_classes = [JSONParser, MultiPartParser]

    def create(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        user: Optional[User] = request.profile.user
        if not user:
            raise GithubLoginException()
        gh_user: Optional[GitHubUser] = user.github
        if not gh_user:
            raise GithubLoginException()
        if not user.is_staff:
            raise TemporaryProjectCreationStaffOnlyException()

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

    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        project: Project = self.get_object()

        project.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)


def truncate_comma_separate(string_list: list[str], max_length: int) -> str:
    value = ""
    for element in sorted(string_list, key=len):
        if len(value) + len(element) + 1 > max_length:
            return value.removesuffix(", ") + "..."
        value += element + ", "
    return value.removesuffix(", ")


def make_pr_name(files_to_funcs: dict[str, list[str]]) -> str:
    num_funcs = sum(len(funcs) for funcs in files_to_funcs.values())
    num_files = len(files_to_funcs)
    if num_funcs == 1:
        assert num_files == 1
        file, func = list(files_to_funcs.items())[0]
        return f"Match {func[0]} from {file}"
    elif num_files == 1:
        file = list(files_to_funcs.keys())[0]
        func_list = truncate_comma_separate(files_to_funcs[file], 70)
        return f"Match {num_funcs} funcs ({func_list}) from {file}"
    else:
        file_list = truncate_comma_separate(list(files_to_funcs.keys()), 40)
        all_funcs: list[str] = []
        for _, funcs in files_to_funcs.items():
            all_funcs.extend(funcs)
        func_list = truncate_comma_separate(all_funcs, 60)
        return (
            f"Match {num_funcs} functions ({func_list}) "
            f"in {num_files} files ({file_list})"
        )


class ProjectMemberViewSet(
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    GenericViewSet,  # type: ignore
):
    serializer_class = ProjectMemberSerializer
    permission_classes = [IsProjectMemberOrReadOnly]

    def get_queryset(self) -> QuerySet[ProjectMember]:
        return ProjectMember.objects.filter(project=self.kwargs["parent_lookup_slug"])

    def get_object(self) -> ProjectMember:
        return ProjectMember.objects.get(
            project=self.kwargs["parent_lookup_slug"],
            user__username=self.kwargs["pk"],
        )

    def perform_create(self, serializer: BaseSerializer[Any]) -> None:
        project = Project.objects.get(slug=self.kwargs["parent_lookup_slug"])
        try:
            serializer.save(project=project)
        except IntegrityError:
            raise ProjectMemberExists()

    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        member: ProjectMember = self.get_object()
        if ProjectMember.objects.filter(project=member.project).count() == 1:
            raise ProjectMustHaveMembersException()
        return super().destroy(request, *args, **kwargs)


router = ExtendedSimpleRouter(trailing_slash=False)
projects_router = router.register(r"project", ProjectViewSet)
projects_router.register(
    r"members",
    ProjectMemberViewSet,
    basename="projectmember",
    parents_query_lookups=["slug"],
)
