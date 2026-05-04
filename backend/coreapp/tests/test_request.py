from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from coreapp import compilers, platforms
from coreapp.models.profile import Profile
from coreapp.sandbox import Sandbox
from coreapp.tests.common import BaseTestCase, requiresCompiler


class RequestTests(APITestCase):
    def test_cookie_less_current_user_does_not_create_profile(self) -> None:
        """
        Ensure that a passive current-user read does not create a session profile.
        """

        response = self.client.get(reverse("current-user"), HTTP_USER_AGENT="browser")
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

        response = self.client.get(
            reverse("current-user"), HTTP_USER_AGENT="node-fetch"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(Profile.objects.count(), 0)


class TimeoutTests(BaseTestCase):
    @requiresCompiler(compilers.DUMMY_LONGRUNNING)
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

    # if we don't have DUMMY_LONGRUNNING, it means we'll be unable to use sandbox.run_subprocess
    @requiresCompiler(compilers.DUMMY_LONGRUNNING)
    def test_zero_timeout(self) -> None:
        # Tests that passing a timeout of zero to sandbox.run_subprocess will equate
        # to disabling the timeout entirely
        expected_output = "AAAAAAAA"

        with Sandbox() as sandbox:
            sandboxed_proc = sandbox.run_subprocess(
                f"sleep 3 && echo {expected_output}", timeout=0, shell=True
            )

            self.assertEqual(sandboxed_proc.returncode, 0)
            self.assertIn(expected_output, sandboxed_proc.stdout)
