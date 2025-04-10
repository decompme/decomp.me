import logging
from typing import Any

import django_filters
from django import forms
from django.db.models import Count

from rest_framework.exceptions import APIException
from rest_framework.serializers import BaseSerializer

from coreapp.models.preset import Preset
from coreapp.serializers import PresetSerializer
from rest_framework import filters, serializers, status
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import SAFE_METHODS, BasePermission, IsAdminUser
from rest_framework.routers import DefaultRouter
from rest_framework.viewsets import ModelViewSet

logger = logging.getLogger(__name__)


class AuthorizationException(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You must be logged in to perform this action."


class PresetPagination(CursorPagination):
    ordering = "-creation_time"
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class IsOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request: Any, view: Any, obj: Any) -> bool:
        if request.method in SAFE_METHODS:
            return True
        if isinstance(obj, Preset):
            return obj.owner == request.profile
        return False


class PresetFilterSet(django_filters.FilterSet):
    owner = django_filters.CharFilter(widget=forms.HiddenInput())

    class Meta:
        model = Preset
        fields = ["platform", "compiler", "owner"]


class PresetViewSet(ModelViewSet):  # type: ignore
    permission_classes = [IsAdminUser | IsOwnerOrReadOnly]
    queryset = Preset.objects.all().annotate(num_scratches=Count("scratch__preset__id"))
    pagination_class = PresetPagination
    filterset_class = PresetFilterSet
    filter_backends = [
        django_filters.rest_framework.DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["id", "name", "platform", "compiler", "owner__user__username"]
    ordering_fields = ["creation_time", "id", "name", "compiler", "num_scratches"]

    def get_serializer_class(self) -> type[serializers.ModelSerializer[Preset]]:
        return PresetSerializer

    # creation is a special case where you cannot be an owner
    # therefore we only check if the user is authenticated or not
    def perform_create(self, serializer: BaseSerializer[Any]) -> None:
        if self.request.profile.is_anonymous():
            raise AuthorizationException()

        serializer.save(owner=self.request.profile)


router = DefaultRouter(trailing_slash=False)
router.register(r"preset", PresetViewSet)
