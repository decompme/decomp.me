"""
Common utilities and fixtures for integration tests.
"""

# ruff: noqa: E402
# Django setup must happen before importing Django models

import os
import sys
from pathlib import Path
from typing import Any

# Add backend to path so we can import Django models
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Setup Django settings BEFORE any Django imports
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "decompme.settings")

import django

django.setup()

# Now we can import Django and rest_framework
import pytest
from coreapp.models.scratch import Scratch
from rest_framework import status
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    """Return an API client configured for integration tests."""
    client = APIClient()
    client.credentials(HTTP_USER_AGENT="IntegrationTest 1.0")
    return client


@pytest.fixture
def cromper_url():
    """Return the cromper URL from environment or use default."""
    return os.getenv("CROMPER_URL", "http://localhost:3000")


class IntegrationTestBase:
    """Base class for integration tests with common utilities."""

    @staticmethod
    def create_scratch(client: APIClient, partial: dict[str, Any]) -> Scratch:
        """
        Create a scratch via API and return the database object.

        This will trigger cromper compilation if source_code is provided.
        """
        from django.urls import reverse

        response = client.post(reverse("scratch-list"), partial, format="json")
        assert response.status_code == status.HTTP_201_CREATED, response.json()
        scratch = Scratch.objects.get(slug=response.json()["slug"])
        assert scratch is not None
        return scratch

    @staticmethod
    def create_nop_scratch(client: APIClient) -> Scratch:
        """Create a simple NOP scratch for testing."""
        scratch_dict = {
            "compiler": "gcc2.8.1pm",
            "platform": "n64",
            "context": "",
            "target_asm": "jr $ra\nnop\n",
        }
        return IntegrationTestBase.create_scratch(client, scratch_dict)


def pytest_configure(config):
    """Configure pytest for Django."""
    from django.conf import settings

    # Ensure we're using test database
    if not settings.configured:
        settings.configure()


def pytest_collection_modifyitems(config, items):
    """Add integration test marker to all tests in this directory."""
    for item in items:
        item.add_marker(pytest.mark.integration)
