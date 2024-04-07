from typing import Dict

from django.utils.timezone import now
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from coreapp import libraries

from ..decorators.django import condition

boot_time = now()


class LibraryDetail(APIView):
    @staticmethod
    def libraries_json(platform: str = "") -> list[dict[str, object]]:
        return [
            {
                "name": l.name,
                "supported_versions": l.supported_versions,
                "platform": l.platform,
            }
            for l in libraries.available_libraries()
            if platform == "" or l.platform == platform
        ]

    @condition(last_modified_func=lambda request: boot_time)
    def head(self, request: Request) -> Response:
        return Response()

    @condition(last_modified_func=lambda request: boot_time)
    def get(self, request: Request) -> Response:
        platform = request.query_params.get("platform", "")
        return Response(
            {
                "libraries": LibraryDetail.libraries_json(platform=platform),
            }
        )
