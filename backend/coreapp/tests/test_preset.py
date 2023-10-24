from typing import Any, Dict

from django.test import Client

from coreapp.compilers import GCC281PM
from coreapp.models.preset import Preset
from coreapp.platforms import N64, PS1
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

    def create_preset(self, partial: Dict[str, Any]) -> Preset:
        response = self.client.post(reverse("preset-list"), partial)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.json())
        preset = Preset.objects.get(id=response.json()["id"])
        assert preset is not None
        return preset

    @requiresCompiler(GCC281PM)
    def test_create_preset(self) -> None:
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
