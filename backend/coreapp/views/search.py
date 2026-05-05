from rest_framework.response import Response
from rest_framework.serializers import ValidationError
from rest_framework.views import APIView

from ..decorators.cache import globally_cacheable
from ..middleware import Request
from ..models.preset import Preset
from ..models.profile import Profile
from ..models.scratch import Scratch
from ..serializers import PresetSerializer, TerseScratchSerializer, serialize_profile

MAX_SEARCH_PAGE_SIZE = 50


def get_page_size(raw_page_size: str) -> int:
    try:
        page_size = int(raw_page_size)
    except ValueError:
        raise ValidationError({"page_size": "Must be an integer."})

    if page_size < 1:
        raise ValidationError({"page_size": "Must be at least 1."})

    return min(page_size, MAX_SEARCH_PAGE_SIZE)


class SearchViewSet(APIView):
    @globally_cacheable(max_age=60, stale_while_revalidate=30)
    def get(self, request: Request) -> Response:
        query = request.query_params.get("search", "")
        page_size = get_page_size(request.query_params.get("page_size", "5"))

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
