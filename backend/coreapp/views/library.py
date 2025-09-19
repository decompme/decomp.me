from django.utils.timezone import now
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..cromper_client import get_cromper_client
from ..decorators.django import condition

boot_time = now()


class LibraryDetail(APIView):
    @staticmethod
    def libraries_json(platform: str = "") -> list[dict[str, object]]:
        cromper_client = get_cromper_client()
        return cromper_client.get_libraries(platform=platform)

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
