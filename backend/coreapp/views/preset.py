import logging
from typing import Any

import django_filters
from coreapp.models.preset import Preset
from coreapp.serializers import PresetSerializer
from rest_framework import filters, serializers, status
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter
from rest_framework.viewsets import ModelViewSet

logger = logging.getLogger(__name__)


class PresetPagination(CursorPagination):
    ordering = "-last_updated"
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class PresetViewSet(ModelViewSet):  # type: ignore
    queryset = Preset.objects.all()  # type: ignore
    pagination_class = PresetPagination
    filterset_fields = ["platform", "compiler"]
    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        filters.SearchFilter,
    ]
    search_fields = ["id", "name", "platform", "compiler"]

    def get_serializer_class(self) -> type[serializers.ModelSerializer[Preset]]:
        return PresetSerializer

    def create(self, request: Any, *args: Any, **kwargs: Any) -> Response:
        # Check permission
        if not request.profile.is_staff():
            response = self.retrieve(request, *args, **kwargs)
            response.status_code = status.HTTP_403_FORBIDDEN
            return response

        response = super().create(request, *args, **kwargs)
        return response

    def update(self, request: Any, *args: Any, **kwargs: Any) -> Response:
        # Check permission
        if not request.profile.is_staff():
            response = self.retrieve(request, *args, **kwargs)
            response.status_code = status.HTTP_403_FORBIDDEN
            return response

        response = super().update(request, *args, **kwargs)
        return response

    def destroy(self, request: Any, *args: Any, **kwargs: Any) -> Response:
        # Check permission
        if not request.profile.is_staff():
            response = self.retrieve(request, *args, **kwargs)
            response.status_code = status.HTTP_403_FORBIDDEN
            return response

        response = super().destroy(request, *args, **kwargs)
        return response


router = DefaultRouter(trailing_slash=False)
router.register(r"preset", PresetViewSet)
