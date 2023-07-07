import logging
import random
import re
import string
from threading import Thread
from typing import Any, Optional

import django_filters
from django.db.models.query import QuerySet
from django.views import View
from django.contrib.auth.models import User
from django.db.utils import IntegrityError

from github import Github, UnknownObjectException
from github.Repository import Repository
from github.GithubException import GithubException
from rest_framework import filters, mixins, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework_extensions.routers import ExtendedSimpleRouter
from rest_framework.request import Request
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.serializers import BaseSerializer

from ..models.github import (
    GitHubRepo,
    GitHubRepoBusyException,
    GitHubUser,
    MissingOAuthScopeException,
)
from ..models.project import Project, ProjectFunction, ProjectMember
from ..models.scratch import Scratch
from ..models.profile import Profile
from ..serializers import (
    ProjectFunctionSerializer,
    ProjectMemberSerializer,
    ProjectSerializer,
    ScratchSerializer,
    TerseScratchSerializer,
)

logger = logging.getLogger(__name__)


class NotProjectMaintainer(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You must be a project maintainer to perform this action."


class GithubLoginException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You must be logged in to Github to perform this action."


class ScratchNotProjectFunctionException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Scratches given must be part of the project."


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


class ProjectFunctionPagination(CursorPagination):
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

        repo: GitHubRepo = project.repo
        repo.pull()

        ProjectMember(project=project, user=request.profile.user).save()

        return Response(
            ProjectSerializer(project, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        project: Project = self.get_object()
        repo: GitHubRepo = project.repo

        project.delete()
        repo.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["POST"])
    def pull(self, request: Request, pk: str) -> Response:
        project: Project = self.get_object()
        repo: GitHubRepo = project.repo

        if not repo.is_pulling:
            t = Thread(target=GitHubRepo.pull, args=(project.repo,))
            t.start()

        repo.is_pulling = True  # Respond with is_pulling=True; the thread will save is_pulling=True to the DB
        return Response(
            ProjectSerializer(project, context={"request": request}).data,
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["POST"])
    def pr(self, request: Request, pk: str) -> Response:
        scratch_slugs = request.data.get("scratch_slugs", [])

        if isinstance(scratch_slugs, str):
            scratch_slugs = [scratch_slugs]

        if not isinstance(scratch_slugs, list) or len(scratch_slugs) == 0:
            raise PrMustHaveScratchesException()

        project: Project = self.get_object()
        user: Optional[User] = request.profile.user
        if not user:
            raise GithubLoginException()
        token = user.github.access_token
        github_repo: Repository = project.repo.details(token)
        head_sha = project.repo.get_sha()

        # Get or create fork
        try:
            fork = Github(token).get_repo(f"{request.profile}/{github_repo.name}")
        except UnknownObjectException:
            fork = Github(token).get_user().create_fork(github_repo)

        # Create branch on fork
        fork_branch = generate_branch_name()
        while True:
            try:
                fork.create_git_ref(ref=f"refs/heads/{fork_branch}", sha=head_sha)
                break
            except GithubException as e:
                if e.status == 422:
                    # Branch already exists, pick a new one
                    fork_branch = generate_branch_name()
                elif e.status == 404:
                    # Missing permissions (unsure why 404, but that's what Github returns)
                    raise MissingOAuthScopeException("public_repo")
                else:
                    raise e

        files_to_funcs: dict[str, list[str]] = {}
        filesystem: dict[str, str] = {}  # Local cache
        for scratch_slug in scratch_slugs:
            assert isinstance(scratch_slug, str)
            scratch: Scratch = Scratch.objects.get(slug=scratch_slug)

            fn: Optional[ProjectFunction] = scratch.project_function
            if fn is None or fn.project != project:
                raise ScratchNotProjectFunctionException()

            # Get file contents if needed
            if fn.src_file not in filesystem:
                contents_data = fork.get_contents(fn.src_file)
                contents = (
                    contents_data[0]
                    if isinstance(contents_data, list)
                    else contents_data
                )
                filesystem[fn.src_file] = contents.decoded_content.decode() or ""

            # Change file contents
            old_content = filesystem[fn.src_file]
            new_content = re.sub(
                # TODO: escape function name?
                rf"INCLUDE_ASM\([^,]+, [^,]+, {scratch.diff_label}[^\)]*\);",
                scratch.source_code,
                old_content,
                flags=re.MULTILINE,
            )
            assert (
                new_content != old_content
            ), f"Unable to find INCLUDE_ASM for {scratch.diff_label}"

            # Prepare commit message
            commit_message = f"Match {fn.display_name} ({fn.src_file})\n"
            seen_usernames = set()
            seen_usernames.add(user.username)
            for parent_scratch in scratch.all_parents():
                profile = parent_scratch.owner

                # Skip anons
                if not profile or not profile.user:
                    continue

                if profile.user.username not in seen_usernames:
                    seen_usernames.add(profile.user.username)
                    gh_user = GitHubUser.objects.get(user=profile.user)
                    commit_message += f"\nCo-authored by: {gh_user.details().name} <{profile.user.email}>"

            # Update the file on the branch & in our local cache
            fork.update_file(
                message=commit_message,
                path=fn.src_file,
                content=new_content,
                sha=contents.sha,
                branch=fork_branch,
            )
            filesystem[fn.src_file] = new_content

            files_to_funcs.setdefault(fn.src_file, []).append(fn.display_name)

        # Create PR
        body = "Matches:\n"
        for file in files_to_funcs:
            body += f"- {file}\n"
            for func in files_to_funcs[file]:
                body += f"  - {func}\n"
        body += "\n\n###### Generated by [decomp.me](https://decomp.me)"
        response = github_repo.create_pull(
            title=make_pr_name(files_to_funcs),
            body=body,
            head=f"{request.profile}:{fork_branch}",
            base=github_repo.default_branch,
            draft=True,
        )
        return Response({"url": response.html_url})


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


class ProjectFunctionViewSet(
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    GenericViewSet,  # type: ignore
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
projects_router = router.register(r"projects", ProjectViewSet)
projects_router.register(
    r"functions",
    ProjectFunctionViewSet,
    basename="projectfunction",
    parents_query_lookups=["slug"],
)
projects_router.register(
    r"members",
    ProjectMemberViewSet,
    basename="projectmember",
    parents_query_lookups=["slug"],
)
