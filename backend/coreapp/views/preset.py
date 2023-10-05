import logging

import django_filters
from coreapp.models.preset import Preset
from coreapp.serializers import PresetSerializer
from rest_framework import filters, serializers
from rest_framework.pagination import CursorPagination
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


router = DefaultRouter(trailing_slash=False)
router.register(r"preset", PresetViewSet)
