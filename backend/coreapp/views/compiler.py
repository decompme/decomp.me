import typing
from datetime import datetime

from django.utils.decorators import method_decorator
from django.utils.timezone import now
from rest_framework.exceptions import NotFound
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from coreapp.models.preset import Preset

from ..cromper_client import get_cromper_client
from ..decorators.cache import globally_cacheable
from ..decorators.django import condition

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
        platform: str | None = "",
        compiler: str | None = "",
    ) -> Response:
        all_compilers = CompilerDetail.compilers_json()
        filtered = {
            compiler_id: compiler_data
            for compiler_id, compiler_data in all_compilers.items()
            if compiler_data.get("platform") == platform
        }
        if not filtered:
            raise NotFound(detail="No compilers found for specified platform")

        if compiler:
            filtered = {
                compiler_id: compiler_data
                for compiler_id, compiler_data in filtered.items()
                if compiler_id == compiler
            }
            if not filtered:
                raise NotFound(detail="Compiler not found")

        return Response(filtered)


@method_decorator(
    globally_cacheable(max_age=300, stale_while_revalidate=30), name="dispatch"
)
class CompilerDetail(APIView):
    @staticmethod
    def compilers_json() -> dict[str, dict[str, object]]:
        return {
            compiler.id: {
                "platform": compiler.platform.id,
                "flags": compiler.flags,
                "diff_flags": compiler.diff_flags,
            }
            for compiler in get_cromper_client().get_compilers().values()
        }

    @staticmethod
    def platforms_json() -> dict[str, dict[str, object]]:
        return {
            platform.id: {
                "id": platform.id,
                "name": platform.name,
                "description": platform.description,
                "arch": platform.arch,
                "compilers": platform.compilers,
                "has_decompiler": platform.has_decompiler,
            }
            for platform in get_cromper_client().get_platforms().values()
        }

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
