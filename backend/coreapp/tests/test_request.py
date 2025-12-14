from coreapp.models.profile import Profile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from coreapp import compilers, platforms
from coreapp.error import AssemblyError, ObjdumpError, custom_exception_handler
from coreapp.models.profile import Profile
from coreapp.sandbox import Sandbox
from coreapp.tests.common import BaseTestCase, requiresCompiler


class RequestTests(APITestCase):
    def test_health_check_is_stateless(self) -> None:
        response = self.client.get(reverse("healthz"), HTTP_USER_AGENT="browser")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {"ok": True})
        self.assertEqual(Profile.objects.count(), 0)
        self.assertNotIn("sessionid", response.cookies)

    def test_cookie_less_current_user_does_not_create_profile(self) -> None:
        """
        Ensure that a passive current-user read does not create a session profile.
        """

        response = self.client.get(reverse("stats"), HTTP_USER_AGENT="browser")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertTrue(response.json()["is_ephemeral"])
        self.assertIsNone(response.json()["id"])
        self.assertEqual(Profile.objects.count(), 0)
        self.assertNotIn("sessionid", response.cookies)

    def test_anonymous_scratch_create_creates_profile(self) -> None:
        """
        Ensure that stateful anonymous requests still create a session profile.
        """

        scratch_dict = {
            "compiler": compilers.DUMMY.id,
            "platform": platforms.DUMMY.id,
            "context": "",
            "target_asm": "jr $ra\nnop\n",
        }
        response = self.client.post(
            reverse("scratch-list"),
            scratch_dict,
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

    def test_node_fetch_request(self) -> None:
        """
        Ensure that we don't create profiles for node-fetch requests (SSR)
        """

        response = self.client.get(reverse("stats"), HTTP_USER_AGENT="node-fetch")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(Profile.objects.count(), 0)
