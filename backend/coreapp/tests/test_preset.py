from typing import Any, Dict

from django.test import Client

from coreapp.compilers import GCC281PM, DUMMY
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
        self.password = User.objects.make_random_password()
        user, created = User.objects.get_or_create(username=self.username)
        user.set_password(self.password)
        user.is_staff = True
        user.is_superuser = True
        user.save()
        self.user = user
        self.client.login(username=self.username, password=self.password)
        
    def create_user(self) -> None:
        self.username = "dummy-user"
        self.password = User.objects.make_random_password()
        user, created = User.objects.get_or_create(username=self.username)
        user.set_password(self.password)
        user.save()
        self.user = user
        self.client.login(username=self.username, password=self.password)

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
        assert preset.owner.id == self.user.id
        
    def test_list_preset_by_owner(self) -> None:
        # Create a new user and make it create a preset
        self.create_user()
        self.create_preset(DUMMY_PRESET_DICT)
        
        # Let's list all the user's presets
        response = self.client.get(f"{reverse('preset-list')}?owner={self.user.id}")
        # Ensure the response is OK
        assert response.status_code == status.HTTP_200_OK
        # Check we only get one preset owned by the user
        results = response.data.get('results')
        assert len(results) == 1
        assert results[0].get('name') == DUMMY_PRESET_DICT.get('name')
        # Ensure the user is the owner of the preset
        assert results[0].get('owner') == self.user.id

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
