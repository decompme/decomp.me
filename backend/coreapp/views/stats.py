from django.utils.decorators import method_decorator

from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..decorators.cache import globally_cacheable

from ..models.scratch import Asm, Scratch
from ..models.github import GitHubUser


@method_decorator(
    globally_cacheable(max_age=60, stale_while_revalidate=30), name="dispatch"
)
class StatsDetail(APIView):
    def get(self, request: Request) -> Response:
        return Response(
            {
                "asm_count": Asm.objects.count(),
                "scratch_count": Scratch.objects.count(),
                "github_user_count": GitHubUser.objects.count(),
            }
        )
