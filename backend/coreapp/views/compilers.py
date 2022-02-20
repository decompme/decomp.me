from coreapp.compiler_wrapper import CompilerWrapper
from django.utils.timezone import now
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..decorators.django import condition

boot_time = now()


class CompilersDetail(APIView):
    @condition(last_modified_func=lambda request: boot_time)
    def head(self, request: Request):
        return Response()

    @condition(last_modified_func=lambda request: boot_time)
    def get(self, request: Request):
        return Response(
            {
                # compiler_ids is used by the permuter
                "compiler_ids": CompilerWrapper.available_compiler_ids(),
                "compilers": CompilerWrapper.available_compilers(),
                "platforms": CompilerWrapper.available_platforms(),
            }
        )
