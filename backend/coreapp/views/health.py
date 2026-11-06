from django.db import connection
from django.http import HttpResponse
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheck(APIView):
    def _check(self) -> bool:
        try:
            connection.ensure_connection()
        except Exception:
            return False

        return True

    def get(self, request: Request) -> Response:
        if not self._check():
            return Response({"ok": False}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({"ok": True})

    def head(self, request: Request) -> HttpResponse:
        response_status = (
            status.HTTP_200_OK if self._check() else status.HTTP_503_SERVICE_UNAVAILABLE
        )
        return HttpResponse(status=response_status)
