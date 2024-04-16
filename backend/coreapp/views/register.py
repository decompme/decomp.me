from rest_framework import status
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework.response import Response

from ..registry import registry


class Register(APIView):
    def post(self, request: Request):

        # TODO: should we return JSON? {"msg": "..."}?

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
                "Error: 'hostname' not found in request",
                status=status.HTTP_400_BAD_REQUEST,
            )
        port = payload.get("port")
        if port is None:
            return Response(
                "Error: 'port' not found in request", status=status.HTTP_400_BAD_REQUEST
            )

        if not isinstance(port, int) or port < 0 or port > 65536:
            return Response(
                "Error: Invalid value for 'port', must be a positive integer between 1..65536",
                status=status.HTTP_400_BAD_REQUEST,
            )

        res = registry.register_host(
            hostname,
            port,
            payload.get("platforms", []),
            payload.get("compilers", []),
            payload.get("libraries", []),
        )
        if res:
            return Response("Registration successful!", status=status.HTTP_201_CREATED)

        return Response("Registration failed!", status=status.HTTP_400_BAD_REQUEST)
