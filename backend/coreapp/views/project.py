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
from github.GithubException import GithubException
from rest_framework import filters, mixins, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import APIException
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.viewsets import GenericViewSet
from rest_framework_extensions.routers import ExtendedSimpleRouter

from coreapp.middleware import Request

from ..models.github import GitHubRepo, GitHubRepoBusyException, GitHubUser
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


def generate_branch_name() -> str:
    suffix = "".join(
        random.choice(string.ascii_lowercase + string.digits) for _ in range(5)
    )
    return f"decompme_GEN_{suffix}"


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
