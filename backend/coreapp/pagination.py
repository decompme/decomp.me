from typing import Any

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import QuerySet
from rest_framework.exceptions import ParseError
from rest_framework.pagination import CursorPagination
from rest_framework.request import Request
from rest_framework.views import APIView


class SafeCursorPagination(CursorPagination):
    def paginate_queryset(
        self,
        queryset: QuerySet[Any],
        request: Request,
        view: APIView | None = None,
    ) -> list[Any] | None:
        try:
            return super().paginate_queryset(queryset, request, view)
        except (DjangoValidationError, ValueError) as exc:
            if self._cursor_has_position():
                raise ParseError(self.invalid_cursor_message) from exc
            raise

    def _cursor_has_position(self) -> bool:
        cursor = getattr(self, "cursor", None)
        return getattr(cursor, "position", None) is not None
