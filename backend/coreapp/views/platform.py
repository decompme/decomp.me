from typing import Dict

from coreapp import compilers
from coreapp.models.preset import Preset
from coreapp.serializers import PresetSerializer
from coreapp.views.compilers import CompilersDetail
from django.utils.timezone import now
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..decorators.django import condition

boot_time = now()


class PlatformDetail(APIView):
    @condition(last_modified_func=lambda request: boot_time)
    def head(self, request: Request) -> Response:
        return Response()

    @condition(last_modified_func=lambda request: boot_time)
    def get(self, request: Request) -> Response:
        return Response(
            {
                "platforms": CompilersDetail.platforms_json(),
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
                {
                    "id": platform.id,
                    "name": platform.name,
                    "description": platform.description,
                    "arch": platform.arch,
                    "presets": [
                        PresetSerializer(p).data
                        for p in Preset.objects.filter(platform=platform.id)
                    ],
                }
            )

    return Response(status=404)
