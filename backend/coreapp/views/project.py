import rest_framework
from rest_framework.exceptions import APIException
from rest_framework import status, mixins
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.viewsets import GenericViewSet
from rest_framework.routers import DefaultRouter
from rest_framework.pagination import CursorPagination

import logging

from ..models import Project, ProjectFunction, Scratch
from ..serializers import ProjectFunctionSerializer, ProjectSerializer
from ..github import GitHubRepo
from .scratch import ScratchPagination

logger = logging.getLogger(__name__)

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

        if repo.is_pulling:
            return Response(ProjectSerializer(project, context={ "request": request }).data, status=status.HTTP_409_CONFLICT)

        if not repo.is_maintainer(request):
            raise APIException("Only repo maintainers can pull", status.HTTP_403_FORBIDDEN)

        project.repo.pull() # TODO: in background

        return Response(ProjectSerializer(project, context={ "request": request }).data, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=['GET', 'POST'])
    def functions(self, request, pk):
        project: Project = self.get_object()
        repo: GitHubRepo = project.repo

        if repo.is_pulling:
            raise APIException("Repo is being pulled", status.HTTP_409_CONFLICT)

        if request.method == "POST":
            if not repo.is_maintainer(request):
                raise APIException("Only repo maintainers can add new functions", status.HTTP_403_FORBIDDEN)

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

router = DefaultRouter(trailing_slash=False)
router.register(r'projects', ProjectViewSet)
