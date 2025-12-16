"""
Integration tests for preset functionality that requires compilation.

These tests require cromper to be running.
"""

from typing import Any

import pytest
from coreapp.models.preset import Preset
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status

from .conftest import IntegrationTestBase

SAMPLE_PRESET_DICT = {
    "name": "Kitty's Adventure",
    "platform": "n64",
    "compiler": "gcc2.8.1pm",
    "assembler_flags": "-march=vr4300 -mabi=32 -mtune=vr4300",
    "compiler_flags": "-O2 -G0",
    "decompiler_flags": "-capy",
}


@pytest.mark.integration
class TestPresetWithCompilation(IntegrationTestBase):
    """Tests for preset functionality that requires compilation."""

    @staticmethod
    def create_admin(api_client) -> User:
        """Create and login as an admin user."""
        username = "admin"
        password = "testpassword"
        user, _created = User.objects.get_or_create(username=username)
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.save()
        api_client.login(username=username, password=password)
        return user

    @staticmethod
    def create_preset(api_client, partial: dict[str, Any]) -> Preset:
        """Create a preset via API."""
        response = api_client.post(reverse("preset-list"), partial)
        assert response.status_code == status.HTTP_201_CREATED, response.json()
        preset = Preset.objects.get(id=response.json()["id"])
        assert preset is not None
        return preset

    def test_create_scratch_from_preset(self, api_client):
        """Test creating a scratch from a preset and verifying compilation works."""
        self.create_admin(api_client)
        preset = self.create_preset(api_client, SAMPLE_PRESET_DICT)
        scratch_dict = {
            "preset": str(preset.id),
            "context": "",
            "target_asm": "jr $ra\nnop\n",
        }
        scratch = self.create_scratch(api_client, scratch_dict)
        assert scratch.preset is not None
        assert scratch.preset.id == preset.id
        assert scratch.platform == preset.platform
        assert scratch.compiler == preset.compiler
        assert scratch.compiler_flags == preset.compiler_flags
        assert scratch.libraries == preset.libraries

    def test_create_scratch_from_preset_override(self, api_client):
        """Test creating a scratch from a preset with overrides and verifying compilation works."""
        self.create_admin(api_client)
        preset = self.create_preset(api_client, SAMPLE_PRESET_DICT)
        scratch_dict = {
            "preset": str(preset.id),
            "context": "",
            "target_asm": "jr $ra\nnop\n",
            "compiler_flags": "-O3",
        }
        scratch = self.create_scratch(api_client, scratch_dict)
        assert scratch.preset is not None
        assert scratch.preset.id == preset.id
        assert scratch.platform == preset.platform
        assert scratch.compiler == preset.compiler
        assert scratch.compiler_flags == "-O3"  # should override preset's value
        assert scratch.libraries == preset.libraries
