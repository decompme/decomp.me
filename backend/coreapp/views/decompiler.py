from datetime import datetime
from typing import Dict

from coreapp import decompilers
from django.utils.timezone import now
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from coreapp.models.preset import Preset

from ..decorators.django import condition

boot_time = now()


def endpoint_updated(request: Request) -> datetime:
    return max(Preset.most_recent_updated(request), boot_time)


class DecompilerDetail(APIView):
    @staticmethod
    def decompilers_json(
        arch: str, compiler_type: str, language: str
    ) -> Dict[str, Dict[str, object]]:
        return {
            d.id: {
                # TODO test
                "flags": [f.to_json() for f in d.flags],
            }
            for d in decompilers.available_decompilers()
            if [
                s
                for s in d.specs
                if s.arch == arch
                and s.compiler_type.value == compiler_type
                and s.language.value == language
            ]
        }

    @condition(last_modified_func=endpoint_updated)
    def head(self, request: Request) -> Response:
        return Response()

    @condition(last_modified_func=endpoint_updated)
    def get(self, request: Request) -> Response:
        arch = request.query_params.get("arch", "")
        compiler_type = request.query_params.get("compilerType", "")
        language = request.query_params.get("language", "")
        return Response(
            {
                "decompilers": DecompilerDetail.decompilers_json(arch, compiler_type, language),
            }
        )
