from typing import Any, Dict

from coreapp.models.scratch import Scratch
from django.urls import reverse
from coreapp.tests.mock_cromper_client import mock_cromper
from rest_framework import status
from rest_framework.test import APITestCase


class BaseTestCase(APITestCase):
    def setUp(self) -> None:
        super().setUp()
        self.client.credentials(HTTP_USER_AGENT="Firefrogz 1.0")

    # Create a scratch and return it as a DB object
    @mock_cromper
    def create_scratch(self, partial: Dict[str, Any]) -> Scratch:
        response = self.client.post(reverse("scratch-list"), partial, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.json())
        scratch = Scratch.objects.get(slug=response.json()["slug"])
        assert scratch is not None
        return scratch

    def create_nop_scratch(self) -> Scratch:
        scratch_dict = {
            "compiler": "dummy",
            "platform": "dummy",
            "context": "",
            "target_asm": "jr $ra\nnop\n",
        }
        return self.create_scratch(scratch_dict)
