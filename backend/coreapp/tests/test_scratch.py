from time import sleep
from typing import Any, Dict

from coreapp.models.scratch import Assembly, Scratch
from coreapp.tests.common import BaseTestCase
from django.urls import reverse
from rest_framework import status


class ScratchForkTests(BaseTestCase):
    def test_fork_scratch(self) -> None:
        """
        Ensure that a scratch's fork maintains the relevant properties of its parent
        """
        scratch_dict: Dict[str, Any] = {
            "compiler": "dummy",  # todo use id
            "platform": "dummy",  # todo use id
            "context": "",
            "target_asm": "glabel meow\njr $ra",
            "diff_label": "meow",
            "name": "cat scratch",
            "libraries": [{"name": "directx", "version": "8.0"}],
        }
        scratch = self.create_scratch(scratch_dict)

        slug = scratch.slug

        fork_dict = {
            "compiler": "dummy",  # todo use id
            "platform": "dummy",  # todo use id
            "compiler_flags": "-O2",
            "source_code": "int func() { return 2; }",
            "context": "",
        }

        # Create a fork of the scratch
        response = self.client.post(
            reverse("scratch-fork", kwargs={"pk": slug}), fork_dict
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        new_claim_token = response.json()["claim_token"]
        new_slug = response.json()["slug"]

        scratch = Scratch.objects.get(slug=slug)
        fork = Scratch.objects.get(slug=new_slug)

        # Make sure the diff_label carried over to the fork
        self.assertEqual(scratch.diff_label, fork.diff_label)

        # Make sure the name carried over to the fork
        self.assertEqual(scratch.name, fork.name)

        # Ensure the new scratch has a (unique) claim token
        self.assertIsNotNone(new_claim_token)
        self.assertIsNot(new_claim_token, scratch.claim_token)


class ScratchDetailTests(BaseTestCase):
    def test_404_head(self) -> None:
        """
        Ensure that HEAD requests 404 correctly.
        """
        response = self.client.head(reverse("scratch-detail", args=["doesnt_exist"]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_last_modified(self) -> None:
        """
        Ensure that the Last-Modified header is set.
        """

        scratch = self.create_nop_scratch()

        response = self.client.head(reverse("scratch-detail", args=[scratch.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.headers.get("Last-Modified") is not None)

    def test_if_modified_since(self) -> None:
        """
        Ensure that the If-Modified-Since header is handled.
        """
        scratch = self.create_nop_scratch()

        response = self.client.head(reverse("scratch-detail", args=[scratch.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        last_modified = response.headers.get("Last-Modified")

        # should be unmodified
        response2 = self.client.get(
            reverse("scratch-detail", args=[scratch.slug]),
            HTTP_IF_MODIFIED_SINCE=last_modified,
        )
        self.assertEqual(response2.status_code, status.HTTP_304_NOT_MODIFIED)

        # Last-Modified is only granular to the second
        sleep(1)

        # touch the scratch
        old_last_updated = scratch.last_updated
        scratch.slug = "newslug"
        scratch.save()
        self.assertNotEqual(scratch.last_updated, old_last_updated)

        # should now be modified
        response3 = self.client.get(
            reverse("scratch-detail", args=[scratch.slug]),
            HTTP_IF_MODIFIED_SINCE=last_modified,
        )
        self.assertEqual(response3.status_code, status.HTTP_200_OK)

    def test_double_claim(self) -> None:
        """
        Create a scratch anonymously, claim it, then verify that claiming it again doesn't work.
        """
        scratch = self.create_nop_scratch()
        self.assertIsNone(scratch.owner)

        scratch.claim_token = "1234"
        scratch.save()

        response = self.client.post(
            f"/api/scratch/{scratch.slug}/claim", {"token": "1234"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["success"])

        response = self.client.post(
            f"/api/scratch/{scratch.slug}/claim", {"token": "1234"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.json()["success"])

        updated_scratch = Scratch.objects.first()
        assert updated_scratch is not None
        self.assertIsNotNone(updated_scratch.owner)
        self.assertIsNone(updated_scratch.claim_token)

    def test_family(self) -> None:
        root = self.create_nop_scratch()

        # verify the family only holds root
        response = self.client.get(reverse("scratch-family", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)

        # fork the root
        response = self.client.post(reverse("scratch-fork", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        fork: Scratch = Scratch.objects.get(slug=response.json()["slug"])

        # verify the family holds both
        response = self.client.get(reverse("scratch-family", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 2)

        # fork the fork
        response = self.client.post(reverse("scratch-fork", args=[fork.slug]))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        Scratch.objects.get(slug=response.json()["slug"])

        # verify the family holds all three
        response = self.client.get(reverse("scratch-family", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 3)

    def test_family_order(self) -> None:
        root = self.create_nop_scratch()

        # fork the root
        response = self.client.post(reverse("scratch-fork", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # verify the family holds both, in creation order
        response = self.client.get(reverse("scratch-family", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 2)

    def test_family_checks_hash_only(self) -> None:
        """
        Ensure that scratches with the same target_asm hash belong to the same family, even if their Assembly instances differ somehow
        """

        scratch1_dict = {
            "compiler": "dummy",  # todo use id
            "platform": "dummy",  # todo use id
            "context": "",
            "target_asm": "jr $ra\nnop\n",
        }
        scratch2_dict = {
            "compiler": "dummy",  # todo use id
            "platform": "dummy",  # todo use id
            "context": "",
            "target_asm": "jr $ra\nnop\n",
        }

        scratch1 = self.create_scratch(scratch1_dict)
        scratch2 = self.create_scratch(scratch2_dict)

        assembly_2: Assembly = scratch1.target_assembly
        assembly_2.hash = 0
        assembly_2.pk = None
        assembly_2.save()
        scratch2.target_assembly = assembly_2
        scratch2.save()

        response = self.client.get(reverse("scratch-family", args=[scratch1.slug]))
        self.assertEqual(len(response.json()), 2)

    def test_family_checks_hash_only_empty_asm(self) -> None:
        """
        Ensure that scratches with empty asm do not have a family, even if their asm is the same
        """

        scratch1_dict = {
            "compiler": "dummy",  # todo use id
            "platform": "dummy",  # todo use id
            "context": "",
            "target_asm": " ",
        }
        scratch2_dict = {
            "compiler": "dummy",  # todo use id
            "platform": "dummy",  # todo use id
            "context": "",
            "target_asm": " ",
        }

        scratch1 = self.create_scratch(scratch1_dict)
        self.create_scratch(scratch2_dict)

        response = self.client.get(reverse("scratch-family", args=[scratch1.slug]))
        self.assertEqual(len(response.json()), 1)


class ScratchDatabaseTests(BaseTestCase):
    """Tests for pure Django database and model functionality."""

    def test_scratch_creation_without_compilation(self) -> None:
        """
        Test that we can create a scratch with just target_asm (no compilation).
        """
        scratch_dict = {
            "compiler": "dummy",
            "platform": "dummy",
            "context": "",
            "target_asm": "jr $ra\nnop\n",
        }
        scratch = self.create_scratch(scratch_dict)
        self.assertIsNotNone(scratch)
        self.assertEqual(scratch.compiler, "dummy")
        self.assertEqual(scratch.platform, "dummy")

