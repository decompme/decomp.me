import rest_framework
from rest_framework.exceptions import APIException
from rest_framework import status, mixins
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.viewsets import GenericViewSet
from rest_framework.routers import DefaultRouter
from rest_framework.pagination import CursorPagination
from rest_framework_extensions.routers import ExtendedSimpleRouter
from rest_framework_extensions.mixins import NestedViewSetMixin

import logging
from threading import Thread

from ..models import Project, ProjectFunction, Scratch
from ..serializers import ProjectFunctionSerializer, ProjectSerializer
from ..github import GitHubRepo, GitHubRepoBusy
from .scratch import ScratchPagination

logger = logging.getLogger(__name__)

class NotProjectMaintainer(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You must be a project maintainer to perform this action."

class ProjectPagination(CursorPagination):
    ordering="-creation_time"
    page_size=20
    page_size_query_param="page_size"
    max_page_size=100

class ProjectFunctionPagination(CursorPagination):
    ordering="-creation_time"
    page_size=20
    page_size_query_param="page_size"
    max_page_size=100

class ProjectViewSet(
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    GenericViewSet,
):
    queryset = Project.objects.all()
    pagination_class = ProjectPagination
    serializer_class = ProjectSerializer

    def get_serializer_class(self):
        if self.action == "functions":
            return ProjectFunctionSerializer
        else:
            return ProjectSerializer

    @action(detail=True, methods=['POST'])
    def pull(self, request, pk):
        project: Project = self.get_object()
        repo: GitHubRepo = project.repo

        if not repo.is_maintainer(request):
            raise NotProjectMaintainer()

        if not repo.is_pulling:
            t = Thread(target=GitHubRepo.pull, args=(project.repo,))
            t.start()

        repo.is_pulling = True # Respond with is_pulling=True; the thread will save is_pulling=True to the DB
        return Response(ProjectSerializer(project, context={ "request": request }).data, status=status.HTTP_202_ACCEPTED)

    """
    @action(detail=True, methods=['GET', 'POST'])
    def functions(self, request, pk):
        project: Project = self.get_object()
        repo: GitHubRepo = project.repo

        if repo.is_pulling:
            raise GitHubRepoBusy()

        if request.method == "POST":
            if not repo.is_maintainer(request):
                raise NotProjectMaintainer()

            serializer = ProjectFunctionSerializer(data=request.data, context={ "request": request })
            serializer.is_valid(raise_exception=True)
            function = serializer.save(project=project)
            return Response(ProjectFunctionSerializer(function, context={ "request": request }).data, status=status.HTTP_201_CREATED)
        elif request.method == "GET":
            queryset = ProjectFunction.objects.filter(project=project)
            paginator = ProjectFunctionPagination()

            page = paginator.paginate_queryset(queryset, request=request)
            serializer = ProjectFunctionSerializer(page, many=True, context={ "request": request })
            return paginator.get_paginated_response(serializer.data)
    """

class ProjectFunctionViewSet(
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    GenericViewSet,
    NestedViewSetMixin,
):
    queryset = ProjectFunction.objects.all()
    pagination_class = ProjectFunctionPagination
    serializer_class = ProjectFunctionSerializer

    #def get_queryset(self):
    #    return ProjectFunction.objects.filter(project__slug=self.kwargs["project"])

router = ExtendedSimpleRouter(trailing_slash=False)
(
    router.register(r'projects', ProjectViewSet)
        .register(r'functions', ProjectFunctionViewSet, basename='projectfunction', parents_query_lookups=['slug'])
)
