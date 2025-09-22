from typing import Any, Dict


from coreapp.compilers import GCC281PM
from coreapp.models.preset import Preset
from coreapp.platforms import N64, PS1, DUMMY
from coreapp.tests.common import BaseTestCase, requiresCompiler
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status

SAMPLE_PRESET_DICT = {
    "name": "Kitty's Adventure",
    "platform": N64.id,
    "compiler": GCC281PM.id,
    "assembler_flags": "-march=vr4300 -mabi=32 -mtune=vr4300",
    "compiler_flags": "-O2 -G0",
    "decompiler_flags": "-capy",
}

DUMMY_PRESET_DICT = {
    "name": "Dummy preset",
    "platform": DUMMY.id,
    "compiler": DUMMY.id,
    "assembler_flags": "-fun",
    "compiler_flags": "-very-fun",
    "decompiler_flags": "-potatoes",
}


class PresetTests(BaseTestCase):
    def create_admin(self) -> None:
        self.username = "admin"
        self.password = "testpassword"
        user, created = User.objects.get_or_create(username=self.username)
        user.set_password(self.password)
        user.is_staff = True
        user.is_superuser = True
        user.save()
        self.user = user
        self.client.login(username=self.username, password=self.password)

    def create_user(self, username: str = "dummy-user") -> User:
        self.username = username
        self.password = "testpassword"
        user, created = User.objects.get_or_create(username=self.username)
        user.set_password(self.password)
        user.save()
        self.user = user
        self.client.login(username=self.username, password=self.password)
        return user

    def create_preset(self, partial: Dict[str, Any]) -> Preset:
        response = self.client.post(reverse("preset-list"), partial)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.json())
        preset = Preset.objects.get(id=response.json()["id"])
        assert preset is not None
        return preset

    @requiresCompiler(GCC281PM)
    def test_admin_create_preset(self) -> None:
        self.create_admin()
        self.create_preset(SAMPLE_PRESET_DICT)

    def test_create_preset_not_authenticated(self) -> None:
        try:
            self.create_preset(SAMPLE_PRESET_DICT)
            self.fail(
                "Expected authentication error - non-admins should not be able to create presets"
            )
        except AssertionError:
            pass

    def test_user_create_preset(self) -> None:
        self.create_user()
        preset = self.create_preset(DUMMY_PRESET_DICT)
        assert preset.owner is not None
        assert preset.owner.pk == self.user.pk

    def test_list_compiler_with_custom_presets(self) -> None:
        user = self.create_user()
        self.create_preset(DUMMY_PRESET_DICT)
        response = self.client.get(reverse("compiler"))
        body = response.json()

        assert "platforms" in body
        assert "dummy" in body["platforms"]
        assert "presets" in body["platforms"]["dummy"]
        assert len(body["platforms"]["dummy"]["presets"]) == 1
        assert (
            body["platforms"]["dummy"]["presets"][0]["name"]
            == DUMMY_PRESET_DICT["name"]
        )
        assert body["platforms"]["dummy"]["presets"][0]["owner"]["id"] == user.pk

    def test_owner_can_delete_preset(self) -> None:
        self.create_user()
        preset = self.create_preset(DUMMY_PRESET_DICT)

        url = reverse("preset-detail", kwargs={"pk": preset.pk})
        # Delete user's preset
        response = self.client.delete(url)
        # Ensure the response is OK
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_user_cannot_delete_not_own_preset(self) -> None:
        # Create a first user and a preset
        user_a = self.create_user("user_a")
        preset = self.create_preset(DUMMY_PRESET_DICT)

        # Create a new user
        user_b = self.create_user("user_b")

        assert user_a.pk != user_b.pk

        url = reverse("preset-detail", kwargs={"pk": preset.pk})
        # Try to delete user_a preset
        response = self.client.delete(url)
        # Ensure the response is FORBIDDEN
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_preset_by_owner(self) -> None:
        # Create a new user and make it create a preset
        self.create_user()
        self.create_preset(DUMMY_PRESET_DICT)

        # Let's list all the user's presets
        response = self.client.get(f"{reverse('preset-list')}?owner={self.user.pk}")
        # Ensure the response is OK
        assert response.status_code == status.HTTP_200_OK
        # Check we only get one preset owned by the user
        results = response.data.get("results")
        assert len(results) == 1
        assert results[0].get("name") == DUMMY_PRESET_DICT.get("name")
        # Ensure the user is the owner of the preset
        owner = results[0].get("owner")
        assert owner is not None
        assert owner.get("id") == self.user.pk

    @requiresCompiler(GCC281PM)
    def test_create_preset_with_invalid_compiler(self) -> None:
        self.create_admin()
        try:
            self.create_preset({**SAMPLE_PRESET_DICT, "compiler": "sillycompiler"})
            self.fail("Expected exception")
        except AssertionError:
            pass

        self.create_preset({**SAMPLE_PRESET_DICT, "compiler": GCC281PM.id})

    @requiresCompiler(GCC281PM)
    def test_create_preset_with_invalid_platform(self) -> None:
        self.create_admin()
        try:
            self.create_preset({**SAMPLE_PRESET_DICT, "platform": "sillyplatform"})
            self.fail("Expected exception")
        except AssertionError:
            pass

        self.create_preset({**SAMPLE_PRESET_DICT, "platform": N64.id})

    @requiresCompiler(GCC281PM)
    def test_create_preset_with_mismatched_compiler_and_platform(self) -> None:
        self.create_admin()
        try:
            self.create_preset(
                {**SAMPLE_PRESET_DICT, "platform": PS1.id, "compiler": GCC281PM.id}
            )
            self.fail("Expected exception")
        except AssertionError:
            pass

        self.create_preset(
            {**SAMPLE_PRESET_DICT, "platform": N64.id, "compiler": GCC281PM.id}
        )

    @requiresCompiler(GCC281PM)
    def test_create_scratch_from_preset(self) -> None:
        self.create_admin()
        preset = self.create_preset(SAMPLE_PRESET_DICT)
        scratch_dict = {
            "preset": str(preset.id),
            "context": "",
            "target_asm": "jr $ra\nnop\n",
        }
        scratch = self.create_scratch(scratch_dict)
        assert scratch.preset is not None
        self.assertEqual(scratch.preset.id, preset.id)
        self.assertEqual(scratch.platform, preset.platform)
        self.assertEqual(scratch.compiler, preset.compiler)
        # self.assertEqual(scratch.assembler_flags, preset.assembler_flags)
        self.assertEqual(scratch.compiler_flags, preset.compiler_flags)
        # self.assertEqual(scratch.decompiler_flags, preset.decompiler_flags)
        self.assertEqual(scratch.libraries, preset.libraries)

    @requiresCompiler(GCC281PM)
    def test_create_scratch_from_preset_override(self) -> None:
        self.create_admin()
        preset = self.create_preset(SAMPLE_PRESET_DICT)
        scratch_dict = {
            "preset": str(preset.id),
            "context": "",
            "target_asm": "jr $ra\nnop\n",
            "compiler_flags": "-O3",
        }
        scratch = self.create_scratch(scratch_dict)
        assert scratch.preset is not None
        self.assertEqual(scratch.preset.id, preset.id)
        self.assertEqual(scratch.platform, preset.platform)
        self.assertEqual(scratch.compiler, preset.compiler)
        # self.assertEqual(scratch.assembler_flags, preset.assembler_flags)
        self.assertEqual(
            scratch.compiler_flags, "-O3"
        )  # should override preset's value
        # self.assertEqual(scratch.decompiler_flags, preset.decompiler_flags)
        self.assertEqual(scratch.libraries, preset.libraries)
