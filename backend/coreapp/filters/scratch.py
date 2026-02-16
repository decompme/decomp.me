from typing import Optional
import django_filters

from django.db.models.query import QuerySet

from ..models.scratch import Scratch


class ScratchFilter(django_filters.FilterSet):
    has_owner = django_filters.BooleanFilter(method="filter_has_owner")

    def filter_has_owner(
        self, queryset: QuerySet[Scratch], name: str, value: Optional[bool]
    ) -> QuerySet[Scratch]:
        if value is None:
            return queryset
        return queryset.filter(owner__isnull=not value)

    class Meta:
        model = Scratch
        fields = ["platform", "compiler", "preset"]
