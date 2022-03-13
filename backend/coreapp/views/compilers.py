from collections import OrderedDict
from typing import Dict

from django.utils.timezone import now
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from coreapp import compilers

from ..decorators.django import condition

boot_time = now()


class CompilersDetail(APIView):
    @staticmethod
    def compilers_json() -> Dict[str, Dict[str, object]]:
        return {
            c.id: {
                "platform": c.platform.id,
                "flags": [f.to_json() for f in c.flags],
                "presets": [p.to_json() for p in c.presets],
            }
            for c in compilers.available_compilers()
        }

    @staticmethod
    def platforms_json() -> OrderedDict[str, Dict[str, str]]:
        ret = OrderedDict()

        for platform in compilers.available_platforms():
            ret[platform.id] = {
                "name": platform.name,
                "description": platform.description,
                "arch": platform.arch,
            }

        return ret

    @condition(last_modified_func=lambda request: boot_time)
    def head(self, request: Request):
        return Response()

    @condition(last_modified_func=lambda request: boot_time)
    def get(self, request: Request):
        return Response(
            {
                "compilers": CompilersDetail.compilers_json(),
                "platforms": CompilersDetail.platforms_json(),
            }
        )
