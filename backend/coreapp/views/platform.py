from datetime import datetime

from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..decorators.django import condition

from coreapp.registry import registry
from coreapp import platforms
from coreapp.models.preset import Preset
from coreapp.views.compiler import CompilerDetail


def endpoint_updated(request: Request) -> datetime:
    return max(Preset.most_recent_updated(request), registry.last_updated)


class PlatformDetail(APIView):
    @condition(last_modified_func=endpoint_updated)
    def head(self, request: Request) -> Response:
        return Response()

    @condition(last_modified_func=endpoint_updated)
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
    # TODO: if platforms are managed by 'platforms'
    # platform = registry.get_platform_by_id(id)

    platform = platforms.from_id(id)
    if platform:
        return Response(
            platform.to_json(include_presets=False, include_num_scratches=True)
        )

    return Response(status=404)
