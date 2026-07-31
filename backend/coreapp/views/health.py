from django.db import connection
from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthCheck(APIView):
    def get(self, request: Request) -> Response:
        try:
            connection.ensure_connection()
        except Exception:
            return Response({"ok": False}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        return Response({"ok": True})
