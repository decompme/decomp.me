from typing import Any

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status

from coreapp.models.preset import Preset
from coreapp.tests.common import BaseTestCase
from coreapp.tests.mock_cromper_client import mock_cromper

SAMPLE_PRESET_DICT = {
    "name": "Kitty's Adventure",
    "platform": "n64",
    "compiler": "gcc2.8.1pm",
    "assembler_flags": "-march=vr4300 -mabi=32 -mtune=vr4300",
    "compiler_flags": "-O2 -G0",
    "decompiler_flags": "-capy",
}


class PresetTests(BaseTestCase):
    def create_admin(self) -> User:
        username = "admin"
        secret = "testpassword"
        user = User.objects.create_superuser(username, "", secret)
        if not self.client.login(**{"username": username, "password": secret}):
            raise Exception("Could not log in admin user")
        return user

    def create_user(self, username: str = "dummy-user") -> User:
        secret = "testpassword"
        user = User.objects.create_user(username, "", secret)
        if not self.client.login(**{"username": username, "password": secret}):
            raise Exception("Could not log in test user")
        return user

    @mock_cromper
    def create_preset(self, partial: dict[str, Any]) -> Preset:
        response = self.client.post(reverse("preset-list"), partial)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.json())
        preset = Preset.objects.get(id=response.json()["id"])
        self.assertIsNotNone(preset)
        return preset

    def test_admin_create_preset(self) -> None:
        self.create_admin()
        self.create_preset(SAMPLE_PRESET_DICT)

    @mock_cromper
    def test_create_preset_not_authenticated(self) -> None:
        response = self.client.post(reverse("preset-list"), SAMPLE_PRESET_DICT)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @mock_cromper
    def test_non_admin_cannot_create_preset(self) -> None:
        self.create_user()
        response = self.client.post(reverse("preset-list"), SAMPLE_PRESET_DICT)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_preset_is_not_allowed(self) -> None:
        self.create_admin()
        preset = self.create_preset(SAMPLE_PRESET_DICT)

        response = self.client.delete(
            reverse("preset-detail", kwargs={"pk": preset.pk})
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_create_preset_with_invalid_compiler(self) -> None:
        self.create_admin()
        response = self.client.post(
            reverse("preset-list"),
            {**SAMPLE_PRESET_DICT, "compiler": "sillycompiler"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.create_preset({**SAMPLE_PRESET_DICT, "compiler": "gcc2.8.1pm"})

    def test_create_preset_with_invalid_platform(self) -> None:
        self.create_admin()
        response = self.client.post(
            reverse("preset-list"),
            {**SAMPLE_PRESET_DICT, "platform": "sillyplatform"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.create_preset({**SAMPLE_PRESET_DICT, "platform": "n64"})

    def test_create_preset_with_mismatched_compiler_and_platform(self) -> None:
        self.create_admin()
        response = self.client.post(
            reverse("preset-list"),
            {**SAMPLE_PRESET_DICT, "platform": "dummy", "compiler": "gcc2.8.1pm"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        self.create_preset(
            {**SAMPLE_PRESET_DICT, "platform": "n64", "compiler": "gcc2.8.1pm"}
        )
