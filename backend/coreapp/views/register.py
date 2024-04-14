from rest_framework import status
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.response import Response

from ..registry import registry


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

        platforms = payload.get("platforms")
        platforms_hash = payload.get("platforms_hash")

        compilers = payload.get("compilers")
        compilers_hash = payload.get("compilers_hash")

        libraries = payload.get("libraries")
        libraries_hash = payload.get("libraries_hash")

        res = registry.register_host(
            hostname,
            port,
            platforms,
            platforms_hash,
            compilers,
            compilers_hash,
            libraries,
            libraries_hash,
        )
        if res is True:
            return Response("Registered!", status=status.HTTP_201_CREATED)
        elif res is False:
            return Response("Failed!", status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response("OK!", status=status.HTTP_200_OK)
