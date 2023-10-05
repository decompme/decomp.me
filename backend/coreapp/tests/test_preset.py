from typing import Any, Dict

from coreapp.compilers import GCC281PM
from coreapp.models.preset import Preset
from coreapp.platforms import N64
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
        preset_dict = {
            "id": id,
            "name": "Kitty's Adventure",
            "platform": N64.id,
            "compiler": GCC281PM.id,
            "assembler_flags": "-march=vr4300 -mabi=32 -mtune=vr4300",
            "compiler_flags": "-O2 -G0",
            "decompiler_flags": "-capy",
        }
        created = self.create_preset(SAMPLE_PRESET_DICT)

        found = Preset.objects.get(id=SAMPLE_PRESET_DICT["id"])

        self.assertEqual(created, found)
