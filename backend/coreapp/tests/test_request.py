from coreapp import compilers, platforms
from coreapp.models.profile import Profile
from coreapp.tests.common import BaseTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class RequestTests(APITestCase):
    def test_create_profile(self) -> None:
        """
        Ensure that we create a profile for a normal request
        """

        response = self.client.get(reverse("compilers"), HTTP_USER_AGENT="browser")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(Profile.objects.count(), 1)

    def test_node_fetch_request(self) -> None:
        """
        Ensure that we don't create profiles for node-fetch requests (SSR)
        """

        response = self.client.get(reverse("compilers"), HTTP_USER_AGENT="node-fetch")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(Profile.objects.count(), 0)


class TimeoutTests(BaseTestCase):
    def test_compiler_timeout(self) -> None:
        # Test that a hanging compilation will fail with a timeout error
        with self.settings(COMPILATION_TIMEOUT_SECONDS=3):
            scratch_dict = {
                "compiler": compilers.DUMMY_LONGRUNNING.id,
                "platform": platforms.DUMMY.id,
                "context": "",
                "target_asm": "asm(AAAAAAAA)",
            }

            scratch = self.create_scratch(scratch_dict)

            compile_dict = {
                "slug": scratch.slug,
                "compiler": compilers.DUMMY_LONGRUNNING.id,
                "compiler_flags": "",
                "source_code": "source(AAAAAAAA)",
            }

            response = self.client.post(
                reverse("scratch-compile", kwargs={"pk": scratch.slug}), compile_dict
            )

            self.assertFalse(response.json()["success"])
            self.assertIn("timeout expired", response.json()["compiler_output"].lower())
