import json
from datetime import datetime

from coreapp.cromper_client import get_cromper_client
from coreapp.models.preset import Preset
from coreapp.views.compiler import CompilerDetail

from django.utils.decorators import method_decorator
from django.utils.timezone import now
from rest_framework.decorators import api_view
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..decorators.django import condition
from ..decorators.cache import globally_cacheable


boot_time = now()


def endpoint_updated(request: Request) -> datetime:
    return max(Preset.most_recent_updated(request), boot_time)


@method_decorator(
    globally_cacheable(max_age=300, stale_while_revalidate=30), name="dispatch"
)
class PlatformDetail(APIView):
    @condition(last_modified_func=endpoint_updated)
    def head(self, request: Request) -> Response:
        return Response()

    @condition(last_modified_func=endpoint_updated)
    def get(self, request: Request) -> Response:
        return Response(
            CompilerDetail.platforms_json(
                include_presets=False, include_num_scratches=False
            )
        )


@api_view(["GET"])
@globally_cacheable(max_age=300, stale_while_revalidate=30)
def single_platform(request: Request, id: str) -> Response:
    """
    Gets a platform's basic details including available compilers
    """
    cromper_client = get_cromper_client()
    try:
        platform = cromper_client.get_platform_by_id(id)
        return Response(platform)
    except ValueError:
        return Response(status=404)

    # FIXME:
    # for platform in platforms:
    #     if platform["id"] == id:
    #         return Response(
    #             platform.to_json(
    #                 include_compilers=True,
    #                 include_presets=True,
    #                 include_num_scratches=True,
    #             )
    #         )
