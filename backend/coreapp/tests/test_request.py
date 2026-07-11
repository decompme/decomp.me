from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from coreapp.models.profile import Profile
from coreapp.tests.common import BaseTestCase
from coreapp.tests.mock_cromper_client import mock_cromper


class RequestTests(APITestCase):
    def test_health_check_is_stateless(self) -> None:
        response = self.client.get(reverse("healthz"), HTTP_USER_AGENT="browser")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {"ok": True})
        self.assertEqual(Profile.objects.count(), 0)
        self.assertNotIn("sessionid", response.cookies)

    def test_cookie_less_current_user_does_not_create_profile(self) -> None:
        response = self.client.get(reverse("current-user"), HTTP_USER_AGENT="browser")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["is_ephemeral"])
        self.assertIsNone(response.json()["id"])
        self.assertEqual(Profile.objects.count(), 0)
        self.assertNotIn("sessionid", response.cookies)

    def test_node_fetch_request(self) -> None:
        response = self.client.get(
            reverse("current-user"), HTTP_USER_AGENT="node-fetch"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Profile.objects.count(), 0)

    @mock_cromper
    def test_compilers_is_stateless(self) -> None:
        response = self.client.get(reverse("compilers"), HTTP_USER_AGENT="browser")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Profile.objects.count(), 0)
        self.assertNotIn("sessionid", response.cookies)

    @mock_cromper
    def test_libraries_is_stateless(self) -> None:
        response = self.client.get(reverse("libraries"), HTTP_USER_AGENT="browser")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Profile.objects.count(), 0)
        self.assertNotIn("sessionid", response.cookies)


class StatefulRequestTests(BaseTestCase):
    def test_anonymous_scratch_create_creates_profile(self) -> None:
        response = self.client.post(
            reverse("scratch-list"),
            {
                "compiler": "dummy",
                "platform": "dummy",
                "context": "",
                "target_asm": "jr $ra\nnop\n",
            },
            format="json",
            HTTP_USER_AGENT="browser",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.assertEqual(Profile.objects.count(), 1)
        self.assertIn("sessionid", response.cookies)

        user_response = self.client.get(
            reverse("current-user"), HTTP_USER_AGENT="browser"
        )
        self.assertFalse(user_response.json()["is_ephemeral"])
