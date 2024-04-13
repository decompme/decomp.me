import logging
import json

from rest_framework import status

from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.response import Response

from ..registry import registry

logger = logging.getLogger(__name__)


class Register(APIView):
    def post(self, request: Request):
        if request.content_type != "application/json":
            return Response(
                "Set 'content-type: application/json' and try again",
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = request.data
        request_key = payload.get("key")
        if request_key != "secret":
            return Response("Unauthorized", status=status.HTTP_401_UNAUTHORIZED)

        hostname = payload.get("hostname")
        if hostname is None:
            return Response(
                "'hostname' not found in request", status=status.HTTP_400_BAD_REQUEST
            )
        port = payload.get("port")
        if port is None:
            return Response(
                "'port' not found in request", status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(port, int) or port < 0 or port > 65536:
            return Response(
                "Invalid value for 'port', must be a positive integer between 1..65536",
                status=status.HTTP_400_BAD_REQUEST,
            )

        compilers = payload.get("compilers")
        compilers_hash = payload.get("compilers_hash")

        if compilers is not None and compilers_hash is not None:
            registry.add_host(hostname, port, compilers, compilers_hash)
            return Response("Ping/Pong!", status=status.HTTP_200_OK)

        if registry.is_known_host(hostname, int(port)):
            return Response("Ping/Pong!", status=status.HTTP_200_OK)

        return Response("Hello new friend!", status=status.HTTP_201_CREATED)
