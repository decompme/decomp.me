from typing import Dict

from django.utils.timezone import now
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from coreapp import libraries

from ..decorators.django import condition

boot_time = now()


class LibrariesDetail(APIView):
    @staticmethod
    def libraries_json() -> list[dict[str, object]]:
        return [
            {"name": l.name, "supported_versions": l.supported_versions}
            for l in libraries.available_libraries()
        ]

    @condition(last_modified_func=lambda request: boot_time)
    def head(self, request: Request) -> Response:
        return Response()

    @condition(last_modified_func=lambda request: boot_time)
    def get(self, request: Request) -> Response:
        return Response(
            {
                "libraries": LibrariesDetail.libraries_json(),
            }
        )
