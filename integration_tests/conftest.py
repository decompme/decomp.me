"""
Common utilities and fixtures for integration tests.
"""

# ruff: noqa: E402

import os
from typing import Any

import pytest

# Setup Django settings (pytest will add backend to path via pythonpath setting)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "decompme.settings")


@pytest.fixture
def api_client():
    """Return an API client configured for integration tests."""
    # Import here to avoid import before django.setup()
    from rest_framework.test import APIClient

    client = APIClient()
    client.credentials(HTTP_USER_AGENT="IntegrationTest 1.0")
    return client


@pytest.fixture
def cromper_url():
    """Return the cromper URL from environment or use default."""
    return os.getenv("CROMPER_URL", "http://localhost:8888")


class IntegrationTestBase:
    """Base class for integration tests with common utilities."""

    @staticmethod
    def create_scratch(client, partial: dict[str, Any]):
        """
        Create a scratch via API and return the database object.

        This will trigger cromper compilation if source_code is provided.
        """
        # Import here to avoid import before django.setup()
        from coreapp.models.scratch import Scratch
        from django.urls import reverse
        from rest_framework import status

        response = client.post(reverse("scratch-list"), partial, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.json()
        scratch = Scratch.objects.get(slug=response.json()["slug"])
        assert scratch is not None
        return scratch

    @staticmethod
    def create_nop_scratch(client):
        """Create a simple NOP scratch for testing."""
        scratch_dict = {
            "compiler": "gcc2.8.1pm",
            "platform": "n64",
            "context": "",
            "target_asm": "jr $ra\nnop\n",
        }
        return IntegrationTestBase.create_scratch(client, scratch_dict)


def pytest_collection_modifyitems(config, items):
    """Add integration test marker to all tests in this directory."""
    for item in items:
        item.add_marker(pytest.mark.integration)
        item.add_marker(pytest.mark.django_db)
