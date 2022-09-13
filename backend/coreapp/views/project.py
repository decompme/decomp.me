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

from github import Github, UnknownObjectException
from github.Repository import Repository
from rest_framework import filters, mixins, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework_extensions.mixins import NestedViewSetMixin
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


class GithubLoginException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You must be logged in to Github to perform this action."


class ScratchNotProjectFunctionException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Scratches given must be part of the project."


class PrMustHaveScratchesException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "You must provide at least one scratch to create a PR."


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

    @action(detail=True, methods=["POST"])
    def pr(self, request, pk):
        scratch_slugs = request.data.get("scratch_slugs", [])

        if not isinstance(scratch_slugs, list) or len(scratch_slugs) == 0:
            raise PrMustHaveScratchesException()

        # TODO: make unique by GETting the branch
        suffix = "".join(
            random.choice(string.ascii_lowercase + string.digits) for _ in range(5)
        )
        fork_branch = f"decompme_GEN_{suffix}"

        project: Project = self.get_object()
        user: Optional[User] = request.profile.user
        if not user:
            raise GithubLoginException()
        token = user.github.access_token
        github_repo: Repository = project.repo.details(token)
        # Get or create fork
        # TODO: likely need to pull this to make it up to date
        # but, it's not local, so we can't pull it... hmm...
        try:
            fork = Github(token).get_repo(f"{request.profile}/{github_repo.name}")
        except UnknownObjectException:
            fork = Github(token).get_user().create_fork(github_repo)

        files_to_funcs: dict[str, list[str]] = {}
        for scratch_slug in scratch_slugs:
            assert isinstance(scratch_slug, str)
            scratch: Scratch = Scratch.objects.get(slug=scratch_slug)

            fn: Optional[ProjectFunction] = scratch.project_function
            if fn is None or fn.project != project:
                raise ScratchNotProjectFunctionException()

            # Change file contents
            contents_data = fork.get_contents(fn.src_file)
            contents = (
                contents_data[0] if isinstance(contents_data, list) else contents_data
            )
            new_content = re.sub(
                # TODO: escape function name?
                rf"INCLUDE_ASM\([^,]+, [^,]+, {scratch.diff_label}[^\)]*\);",
                scratch.source_code,
                contents.content or "",
                flags=re.MULTILINE,
            )

            # Make commit
            message = f"[decomp.me] Decompile {fn.display_name} ({fn.src_file})"
            if (
                scratch.owner != request.profile
                and scratch.owner
                and scratch.owner.user
            ):
                profile = scratch.owner.user
                message += f"\n\nCo-authored by {profile.username} <{profile.email}>"

            fork.update_file(
                message=message,
                path=fn.src_file,
                content=new_content,
                sha=contents.sha,
                branch=fork_branch,
            )
            files_to_funcs.setdefault(fn.src_file, []).append(fn.display_name)

        # Create PR
        body = "Decompiles:\n"
        for file in files_to_funcs:
            body += f"- {file}\n"
            for func in files_to_funcs[file]:
                body += f"  - {func}\n"
        body += "\n---\n\nGenerated by decomp.me"
        response = github_repo.create_pull(
            title=make_pr_name(files_to_funcs),
            body=body,
            head=f"{scratch.owner}:{fork_branch}",
            base=github_repo.default_branch,
            draft=True,
        )
        return Response({"url": response.url})


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
        return f"Decompile {func} from {file}"
    elif num_files == 1:
        file = list(files_to_funcs.keys())[0]
        func_list = truncate_comma_separate(files_to_funcs[file], 70)
        return f"Decompile {num_funcs} funcs ({func_list}) from {file}"
    else:
        file_list = truncate_comma_separate(list(files_to_funcs.keys()), 40)
        all_funcs: list[str] = []
        for _, funcs in files_to_funcs.items():
            all_funcs.extend(funcs)
        func_list = truncate_comma_separate(all_funcs, 60)
        return (
            f"Decompile {num_funcs} functions ({func_list}) "
            f"in {num_files} files ({file_list})"
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
    # .register(
    #     r"pr",
    #     PullRequestViewSet,
    #     basename="pr"
    # )
)
