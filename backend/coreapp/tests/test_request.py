from unittest.mock import patch

from django.urls import reverse
from rest_framework import status

from coreapp.cromper_client import CromperError, CromperUnavailableError
from coreapp.error import AssemblyError, custom_exception_handler
from coreapp.models.profile import Profile
from coreapp.models.scratch import Scratch
from coreapp.serializers import ScratchCreateSerializer
from coreapp.tests import (
    mock_cromper_client as compilers,
    mock_cromper_client as platforms,
)
from coreapp.tests.common import BaseTestCase
from coreapp.tests.mock_cromper_client import patch_cromper


class RequestTests(BaseTestCase):
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

    def test_assembly_errors_are_reported_as_assembler_errors(self) -> None:
        response = custom_exception_handler(AssemblyError("bad asm"), {})

        self.assertIsNotNone(response)
        assert response is not None
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "Assembler")
        self.assertEqual(response.data["kind"], "AssemblyError")
        self.assertEqual(response.data["detail"], "bad asm")

    def test_cromper_unavailable_is_reported_as_service_unavailable(self) -> None:
        response = custom_exception_handler(CromperUnavailableError("boom"), {})

        self.assertIsNotNone(response)
        assert response is not None
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["code"], "ServiceUnavailable")
        self.assertEqual(response.data["kind"], "CromperUnavailableError")
        self.assertEqual(
            response.data["detail"],
            "The compiler service is unavailable. Please try again in a moment.",
        )

    def test_generic_cromper_error_is_reported_as_json(self) -> None:
        response = custom_exception_handler(CromperError("boom"), {})

        self.assertIsNotNone(response)
        assert response is not None
        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data["detail"], "boom")
        self.assertEqual(response.data["kind"], "CromperError")

    def test_serializer_does_not_mask_outage_as_unknown_compiler(self) -> None:
        serializer = ScratchCreateSerializer(data={"compiler": compilers.DUMMY.id})

        with (
            patch_cromper() as mock_client,
            patch.object(
                mock_client,
                "get_compiler_by_id",
                side_effect=CromperUnavailableError("cromper unavailable"),
            ),
            # A cromper outage must propagate (to be rendered as a 503),
            # rather than being reported as an unknown compiler.
            self.assertRaises(CromperUnavailableError),
        ):
            serializer.validate_compiler(compilers.DUMMY.id)

    def test_scratch_creation_falls_back_when_decompile_fails(self) -> None:
        with (
            patch_cromper() as mock_client,
            patch.object(
                mock_client,
                "decompile",
                side_effect=CromperUnavailableError("cromper unavailable"),
            ),
        ):
            response = self.client.post(
                reverse("scratch-list"),
                {
                    "compiler": compilers.DUMMY.id,
                    "platform": platforms.DUMMY.id,
                    "context": "",
                    "target_asm": "jr $ra\nnop\n",
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.json())
        scratch = Scratch.objects.get(slug=response.json()["slug"])
        self.assertEqual(scratch.source_code, "void func(void) {\n    // ...\n}\n")

    def test_decompile_action_reports_failure_as_message(self) -> None:
        scratch = self.create_nop_scratch()

        with (
            patch_cromper() as mock_client,
            patch.object(mock_client, "decompile", side_effect=CromperError("boom")),
        ):
            response = self.client.post(
                reverse("scratch-decompile", kwargs={"pk": scratch.slug}),
                {},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Decompilation failed", response.json()["decompilation"])

    def test_node_fetch_request(self) -> None:
        """
        Ensure that we don't create profiles for node-fetch requests (SSR)
        """

        response = self.client.get(
            reverse("current-user"), HTTP_USER_AGENT="node-fetch"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(Profile.objects.count(), 0)
