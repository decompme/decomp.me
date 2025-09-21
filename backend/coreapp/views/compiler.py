from datetime import datetime
import typing
from typing import Dict, Optional

from coreapp import compilers
from django.utils.decorators import method_decorator
from django.utils.timezone import now
from rest_framework.exceptions import NotFound
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from coreapp.models.preset import Preset

from ..decorators.django import condition
from ..decorators.cache import globally_cacheable


boot_time = now()


def endpoint_updated(request: Request, **_: typing.Any) -> datetime:
    return max(Preset.most_recent_updated(request), boot_time)


@method_decorator(
    globally_cacheable(max_age=300, stale_while_revalidate=30), name="dispatch"
)
class SingleCompilerDetail(APIView):
    @condition(last_modified_func=lambda r, **_: boot_time)
    def get(
        self,
        request: Request,
        platform: Optional[str] = "",
        compiler: Optional[str] = "",
    ) -> Response:

        filtered = [
            c for c in compilers.available_compilers() if c.platform.id == platform
        ]
        if len(filtered) == 0:
            raise NotFound(detail="No compilers found for specified platform")

        if compiler:
            filtered = [c for c in filtered if c.id == compiler]
            if len(filtered) == 0:
                raise NotFound(detail="Compiler not found")

        return Response(
            {
                c.id: {
                    "platform": c.platform.id,
                    "flags": [f.to_json() for f in c.flags],
                    "diff_flags": [f.to_json() for f in c.platform.diff_flags],
                }
                for c in filtered
            }
        )


@method_decorator(
    globally_cacheable(max_age=300, stale_while_revalidate=30), name="dispatch"
)
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
            ret[platform.id] = platform.to_json(
                include_presets=include_presets,
                include_num_scratches=include_num_scratches,
            )

        return ret

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
