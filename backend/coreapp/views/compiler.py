from datetime import datetime
from typing import Dict

from coreapp import compilers
from django.utils.timezone import now
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from coreapp.models.preset import Preset

from ..decorators.django import condition

boot_time = now()


class CompilerDetail(APIView):
    @staticmethod
    def compilers_json() -> Dict[str, Dict[str, object]]:
        return {
            c.id: {
                "platform": c.platform.id,
                "flags": [f.to_json() for f in c.flags],
                "diff_flags": [f.to_json() for f in c.platform.diff_flags],
            }
            for c in compilers.available_compilers()
        }

    @staticmethod
    def platforms_json(
        include_presets: bool = True,
        include_num_scratches: bool = False,
    ) -> Dict[str, Dict[str, object]]:
        ret: Dict[str, Dict[str, object]] = {}

        for platform in compilers.available_platforms():
            ret[platform.id] = platform.to_json(include_presets, include_num_scratches)

        return ret

    def endpoint_updated(request: Request) -> datetime:
        return max(Preset.most_recent_updated(request), boot_time)

    @condition(last_modified_func=endpoint_updated)
    def head(self, request: Request) -> Response:
        return Response()

    @condition(last_modified_func=endpoint_updated)
    def get(self, request: Request) -> Response:
        return Response(
            {
                "compilers": CompilerDetail.compilers_json(),
                "platforms": CompilerDetail.platforms_json(),
            }
        )
