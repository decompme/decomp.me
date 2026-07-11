from collections.abc import Callable
from typing import Any
from unittest import skipIf
from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from coreapp.models.scratch import Scratch
from coreapp.tests.mock_cromper_client import MockCromperClient


def requiresCompiler(*_args: Any) -> Callable[..., Any]:
    return skipIf(False, "")


class BaseTestCase(APITestCase):
    def setUp(self) -> None:
        super().setUp()
        self.claim_tokens: dict[str, str] = {}
        self.client.credentials(HTTP_USER_AGENT="Firefrogz 1.0")

        mock_client = MockCromperClient()
        self._patches = [
            patch("coreapp.cromper_client.get_cromper_client", return_value=mock_client),
            patch("coreapp.serializers.get_cromper_client", return_value=mock_client),
            patch("coreapp.views.scratch.get_cromper_client", return_value=mock_client),
            patch("coreapp.views.compiler.get_cromper_client", return_value=mock_client),
            patch("coreapp.views.library.get_cromper_client", return_value=mock_client),
            patch("coreapp.views.platform.get_cromper_client", return_value=mock_client),
        ]
        for active_patch in self._patches:
            active_patch.start()
        self.addCleanup(lambda: [active_patch.stop() for active_patch in reversed(self._patches)])

    def create_scratch(self, partial: dict[str, Any]) -> Scratch:
        response = self.client.post(reverse("scratch-list"), partial, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.json())
        data = response.json()
        scratch = Scratch.objects.get(slug=data["slug"])
        self.claim_tokens[scratch.slug] = data.get("claim_token")
        return scratch

    def create_nop_scratch(self) -> Scratch:
        return self.create_scratch(
            {
                "compiler": "dummy",
                "platform": "dummy",
                "context": "",
                "target_asm": "jr $ra\nnop\n",
            }
        )
