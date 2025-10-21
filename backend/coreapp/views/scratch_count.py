from django.utils.decorators import method_decorator
from django.utils.http import http_date, parse_http_date_safe
from django.utils.timezone import now

from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from ..decorators.cache import globally_cacheable
from ..models.scratch import Scratch


@method_decorator(
    globally_cacheable(max_age=60, stale_while_revalidate=30), name="dispatch"
)
class ScratchCountView(APIView):
    def get(self, request: Request) -> Response:
        qs = Scratch.objects.all()

        platform = request.query_params.get("platform")
        compiler = request.query_params.get("compiler")
        preset = request.query_params.get("preset")

        if platform:
            qs = qs.filter(platform=platform)
        if compiler:
            qs = qs.filter(compiler=compiler)
        if preset:
            qs = qs.filter(preset_id=preset)

        latest_created = (
            qs.order_by("-creation_time")
            .values_list("creation_time", flat=True)
            .first()
        )
        if latest_created is None:
            latest_created = now()

        if_modified_since = request.headers.get("If-Modified-Since")
        if if_modified_since:
            since_ts = parse_http_date_safe(if_modified_since)
            if since_ts and latest_created.timestamp() <= since_ts:
                return Response(status=304)

        resp = Response({"num_scratches": qs.count()})
        resp["Last-Modified"] = http_date(latest_created.timestamp())
        return resp
