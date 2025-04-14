from rest_framework.views import APIView
from rest_framework.response import Response

from ..middleware import Request
from ..models.preset import Preset
from ..models.scratch import Scratch
from ..models.profile import Profile
from ..serializers import PresetSerializer, TerseScratchSerializer, serialize_profile


class SearchViewSet(APIView):
    def get(self, request: Request) -> Response:
        query = request.query_params.get("search", "")
        page_size = int(request.query_params.get("page_size", "5"))

        user_qs = Profile.objects.filter(user__username__icontains=query)[:page_size]
        preset_qs = Preset.objects.filter(name__icontains=query)[:page_size]
        scratch_qs = Scratch.objects.filter(name__icontains=query)[:page_size]

        results = []

        for user in user_qs:
            results.append(
                {
                    "type": "user",
                    "item": serialize_profile(user),
                }
            )

        for preset in PresetSerializer(preset_qs, many=True).data:
            results.append(
                {
                    "type": "preset",
                    "item": preset,
                }
            )

        for scratch in TerseScratchSerializer(scratch_qs, many=True).data:
            results.append(
                {
                    "type": "scratch",
                    "item": scratch,
                }
            )

        return Response(results)
