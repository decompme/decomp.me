from typing import Any, Dict

from coreapp.compilers import GCC281PM
from coreapp.models.preset import Preset
from coreapp.platforms import N64, PS1
from coreapp.tests.common import BaseTestCase
from django.urls import reverse
from rest_framework import status

SAMPLE_PRESET_DICT = {
    "id": "meowp",
    "name": "Kitty's Adventure",
    "platform": N64.id,
    "compiler": GCC281PM.id,
    "assembler_flags": "-march=vr4300 -mabi=32 -mtune=vr4300",
    "compiler_flags": "-O2 -G0",
    "decompiler_flags": "-capy",
}


class PresetTests(BaseTestCase):
    def create_preset(self, partial: Dict[str, Any]) -> Preset:
        response = self.client.post(reverse("preset-list"), partial)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.json())
        preset = Preset.objects.get(id=response.json()["id"])
        assert preset is not None
        return preset

    def test_create_preset(self) -> None:
        self.create_preset(SAMPLE_PRESET_DICT)

    def test_create_preset_with_invalid_compiler(self) -> None:
        try:
            self.create_preset({**SAMPLE_PRESET_DICT, "compiler": "sillycompiler"})
            self.fail("Expected exception")
        except AssertionError:
            pass

        self.create_preset({**SAMPLE_PRESET_DICT, "compiler": GCC281PM.id})

    def test_create_preset_with_invalid_platform(self) -> None:
        try:
            self.create_preset({**SAMPLE_PRESET_DICT, "platform": "sillyplatform"})
            self.fail("Expected exception")
        except AssertionError:
            pass

        self.create_preset({**SAMPLE_PRESET_DICT, "platform": N64.id})

    def test_create_preset_with_mismatched_compiler_and_platform(self) -> None:
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

    def test_create_scratch_from_preset(self) -> None:
        preset = self.create_preset(SAMPLE_PRESET_DICT)
        scratch_dict = {
            "preset": preset.id,
            "context": "",
            "target_asm": "jr $ra\nnop\n",
        }
        scratch = self.create_scratch(scratch_dict)
        self.assertEqual(scratch.preset, preset.id)
        self.assertEqual(scratch.platform, preset.platform)
        self.assertEqual(scratch.compiler, preset.compiler)
        # self.assertEqual(scratch.assembler_flags, preset.assembler_flags)
        self.assertEqual(scratch.compiler_flags, preset.compiler_flags)
        # self.assertEqual(scratch.decompiler_flags, preset.decompiler_flags)
        self.assertEqual(scratch.libraries, preset.libraries)
