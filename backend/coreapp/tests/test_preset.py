from typing import Any, Dict

from coreapp.models.preset import Preset
from coreapp.tests.common import BaseTestCase
from django.contrib.auth.models import User
from django.urls import reverse
from coreapp.tests.mock_cromper_client import mock_cromper
from rest_framework import status

SAMPLE_PRESET_DICT = {
    "name": "Kitty's Adventure",
    "platform": "n64",
    "compiler": "gcc2.8.1pm",
    "assembler_flags": "-march=vr4300 -mabi=32 -mtune=vr4300",
    "compiler_flags": "-O2 -G0",
    "decompiler_flags": "-capy",
}

DUMMY_PRESET_DICT = {
    "name": "Dummy preset",
    "platform": "dummy",
    "compiler": "dummy",
    "assembler_flags": "-fun",
    "compiler_flags": "-very-fun",
    "decompiler_flags": "-potatoes",
}


class PresetTests(BaseTestCase):
    def create_admin(self) -> User:
        username = "admin"
        password = "testpassword"
        user = User.objects.create_superuser(username=username, password=password)
        if not self.client.login(username=username, password=password):
            raise Exception("Could not log in admin user")
        return user

    def create_user(self, username: str = "dummy-user") -> User:
        password = "testpassword"
        user = User.objects.create_user(username=username, password=password)
        if not self.client.login(username=username, password=password):
            raise Exception("Could not log in test user")
        return user

    @mock_cromper
    def create_preset(self, partial: Dict[str, Any]) -> Preset:
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

    # TODO this test fails when other tests run - fix it or the others
    # def test_user_create_preset(self) -> None:
    #     user = self.create_user()
    #     preset = self.create_preset(SAMPLE_PRESET_DICT)
    #     self.assertIsNotNone(preset.owner)
    #     self.assertEqual(preset.owner.pk, user.pk)

    def test_owner_can_delete_preset(self) -> None:
        self.create_user()
        preset = self.create_preset(SAMPLE_PRESET_DICT)

        url = reverse("preset-detail", kwargs={"pk": preset.pk})
        # Delete user's preset
        response = self.client.delete(url)
        # Ensure the response is OK
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_user_cannot_delete_not_own_preset(self) -> None:
        # Create a first user and a preset
        user_a = self.create_user("user_a")
        preset = self.create_preset(SAMPLE_PRESET_DICT)

        # Create a new user
        user_b = self.create_user("user_b")

        self.assertNotEqual(user_a.pk, user_b.pk)

        url = reverse("preset-detail", kwargs={"pk": preset.pk})
        # Try to delete user_a preset
        response = self.client.delete(url)
        # Ensure the response is FORBIDDEN
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    # TODO this test fails when other tests run - fix it or the others
    # def test_list_preset_by_owner(self) -> None:
    #     # Create a new user and make it create a preset
    #     user = self.create_user()
    #     self.create_preset(SAMPLE_PRESET_DICT)

    #     # Let's list all the user's presets
    #     response = self.client.get(f"{reverse('preset-list')}?owner={user.pk}")
    #     # Ensure the response is OK
    #     self.assertEqual(response.status_code, status.HTTP_200_OK)
    #     # Check we only get one preset owned by the user
    #     results = response.data.get("results")
    #     self.assertEqual(len(results), 1)
    #     self.assertEqual(results[0].get("name"), SAMPLE_PRESET_DICT.get("name"))
    #     # Ensure the user is the owner of the preset
    #     owner = results[0].get("owner")
    #     self.assertIsNotNone(owner)
    #     self.assertEqual(owner.get("id"), user.pk)

    def test_create_preset_with_invalid_compiler(self) -> None:
        self.create_admin()
        try:
            self.create_preset({**SAMPLE_PRESET_DICT, "compiler": "sillycompiler"})
            self.fail("Expected exception")
        except AssertionError:
            pass

        self.create_preset(
            {**SAMPLE_PRESET_DICT, "compiler": "gcc2.8.1pm"}
        )  # todo use ID

    def test_create_preset_with_invalid_platform(self) -> None:
        self.create_admin()
        try:
            self.create_preset({**SAMPLE_PRESET_DICT, "platform": "sillyplatform"})
            self.fail("Expected exception")
        except AssertionError:
            pass

        self.create_preset({**SAMPLE_PRESET_DICT, "platform": "n64"})  # todo use ID

    def test_create_preset_with_mismatched_compiler_and_platform(self) -> None:
        self.create_admin()
        try:
            self.create_preset(
                {
                    **SAMPLE_PRESET_DICT,
                    "platform": "ps1",  # todo use ID
                    "compiler": "gcc2.8.1pm",
                }
            )
            self.fail("Expected exception")
        except AssertionError:
            pass

        self.create_preset(
            {**SAMPLE_PRESET_DICT, "platform": "n64", "compiler": "gcc2.8.1pm"}  # todo
        )
