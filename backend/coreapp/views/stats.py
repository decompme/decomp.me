from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models.scratch import Asm, Scratch
from ..models.github import GitHubUser
from ..models.profile import Profile


class StatsDetail(APIView):
    def get(self, request: Request) -> Response:
        return Response(
            {
                "asm_count": Asm.objects.count(),
                "scratch_count": Scratch.objects.count(),
                "github_user_count": GitHubUser.objects.count(),
                "profile_count": Profile.objects.count(),
            }
        )
