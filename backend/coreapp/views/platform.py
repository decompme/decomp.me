from coreapp import compilers
from coreapp.models.preset import Preset
from coreapp.views.compiler import CompilerDetail
from django.utils.timezone import now
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..decorators.django import condition

boot_time = now()


class PlatformDetail(APIView):
    @condition(last_modified_func=Preset.most_recent_updated)
    def head(self, request: Request) -> Response:
        return Response()

    @condition(last_modified_func=Preset.most_recent_updated)
    def get(self, request: Request) -> Response:
        return Response(
            {
                "platforms": CompilerDetail.platforms_json(
                    include_presets=False, include_num_scratches=True
                ),
            }
        )


@api_view(["GET"])
def single_platform(request: Request, id: str) -> Response:
    """
    Gets a platform's basic data
    """
    platforms = compilers.available_platforms()

    for platform in platforms:
        if platform.id == id:
            return Response(
                platform.to_json(include_presets=False, include_num_scratches=True)
            )

    return Response(status=404)
