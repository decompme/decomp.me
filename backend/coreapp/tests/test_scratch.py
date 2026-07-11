from time import sleep

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status

from coreapp.models.scratch import Scratch
from coreapp.tests.common import BaseTestCase


class ScratchForkTests(BaseTestCase):
    def create_logged_in_user(self, username: str = "forker") -> None:
        password = "testpassword"
        User.objects.create_user(username, "", password)
        if not self.client.login(**{"username": username, "password": password}):
            raise AssertionError("Could not log in test user")

    def test_fork_scratch(self) -> None:
        scratch = self.create_scratch(
            {
                "compiler": "dummy",
                "platform": "dummy",
                "context": "",
                "target_asm": "glabel meow\njr $ra",
                "diff_label": "meow",
                "name": "cat scratch",
                "libraries": [{"name": "directx", "version": "8.0"}],
            }
        )

        self.create_logged_in_user()
        claim_response = self.client.post(
            reverse("scratch-claim", kwargs={"pk": scratch.slug}),
            {"token": self.claim_tokens[scratch.slug]},
        )
        self.assertEqual(claim_response.status_code, status.HTTP_200_OK)
        self.assertTrue(claim_response.json()["success"])

        response = self.client.post(
            reverse("scratch-fork", kwargs={"pk": scratch.slug}),
            {
                "compiler": "dummy",
                "platform": "dummy",
                "compiler_flags": "-O2",
                "source_code": "int func() { return 2; }",
                "context": "",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        fork = Scratch.objects.get(slug=response.json()["slug"])
        scratch.refresh_from_db()

        self.assertEqual(scratch.diff_label, fork.diff_label)
        self.assertEqual(scratch.name, fork.name)
        self.assertEqual(fork.owner, scratch.owner)


class ScratchDetailTests(BaseTestCase):
    def create_logged_in_user(self, username: str = "claimer") -> None:
        password = "testpassword"
        User.objects.create_user(username, "", password)
        if not self.client.login(**{"username": username, "password": password}):
            raise AssertionError("Could not log in test user")

    def test_404_head(self) -> None:
        response = self.client.head(reverse("scratch-detail", args=["doesnt_exist"]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_last_modified(self) -> None:
        scratch = self.create_nop_scratch()

        response = self.client.head(reverse("scratch-detail", args=[scratch.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(response.headers.get("Last-Modified"))

    def test_if_modified_since(self) -> None:
        scratch = self.create_nop_scratch()

        response = self.client.head(reverse("scratch-detail", args=[scratch.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        last_modified = response.headers.get("Last-Modified")

        response2 = self.client.get(
            reverse("scratch-detail", args=[scratch.slug]),
            HTTP_IF_MODIFIED_SINCE=last_modified,
        )
        self.assertEqual(response2.status_code, status.HTTP_304_NOT_MODIFIED)

        sleep(1)

        old_last_updated = scratch.last_updated
        scratch.slug = "newslug"
        scratch.save()
        self.assertNotEqual(scratch.last_updated, old_last_updated)

        response3 = self.client.get(
            reverse("scratch-detail", args=[scratch.slug]),
            HTTP_IF_MODIFIED_SINCE=last_modified,
        )
        self.assertEqual(response3.status_code, status.HTTP_200_OK)

    def test_double_claim(self) -> None:
        scratch = self.create_nop_scratch()
        self.assertIsNone(scratch.owner)

        self.create_logged_in_user()
        token = self.claim_tokens[scratch.slug]

        response = self.client.post(
            f"/api/scratch/{scratch.slug}/claim", {"token": token}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["success"])

        response = self.client.post(
            f"/api/scratch/{scratch.slug}/claim", {"token": token}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.json()["success"])

        updated_scratch = Scratch.objects.get(pk=scratch.pk)
        self.assertIsNotNone(updated_scratch.owner)

    def test_family(self) -> None:
        root = self.create_nop_scratch()
        self.create_logged_in_user()
        self.client.post(
            reverse("scratch-claim", args=[root.slug]),
            {"token": self.claim_tokens[root.slug]},
        )

        response = self.client.get(reverse("scratch-family", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)

        response = self.client.post(reverse("scratch-fork", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        fork: Scratch = Scratch.objects.get(slug=response.json()["slug"])

        response = self.client.get(reverse("scratch-family", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 2)

        response = self.client.post(reverse("scratch-fork", args=[fork.slug]))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        Scratch.objects.get(slug=response.json()["slug"])

        response = self.client.get(reverse("scratch-family", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 3)

    def test_family_order(self) -> None:
        root = self.create_nop_scratch()
        self.create_logged_in_user()
        self.client.post(
            reverse("scratch-claim", args=[root.slug]),
            {"token": self.claim_tokens[root.slug]},
        )

        response = self.client.post(reverse("scratch-fork", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        response = self.client.get(reverse("scratch-family", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 2)

    def test_family_checks_hash_only(self) -> None:
        scratch1 = self.create_scratch(
            {
                "compiler": "dummy",
                "platform": "dummy",
                "context": "",
                "target_asm": "jr $ra\nnop\n",
            }
        )
        self.create_scratch(
            {
                "compiler": "dummy",
                "platform": "dummy",
                "context": "",
                "target_asm": "jr $ra\nnop\n",
            }
        )

        response = self.client.get(reverse("scratch-family", args=[scratch1.slug]))
        self.assertEqual(len(response.json()), 2)

    def test_family_checks_hash_only_empty_asm(self) -> None:
        scratch1 = self.create_scratch(
            {
                "compiler": "dummy",
                "platform": "dummy",
                "context": "",
                "target_asm": " ",
            }
        )
        self.create_scratch(
            {
                "compiler": "dummy",
                "platform": "dummy",
                "context": "",
                "target_asm": " ",
            }
        )

        response = self.client.get(reverse("scratch-family", args=[scratch1.slug]))
        self.assertEqual(len(response.json()), 1)


class ScratchDatabaseTests(BaseTestCase):
    def test_scratch_creation_without_compilation(self) -> None:
        scratch = self.create_scratch(
            {
                "compiler": "dummy",
                "platform": "dummy",
                "context": "",
                "target_asm": "jr $ra\nnop\n",
            }
        )
        self.assertIsNotNone(scratch)
        self.assertEqual(scratch.compiler, "dummy")
        self.assertEqual(scratch.platform, "dummy")
        self.assertIsNone(scratch.context_fk)
        self.assertEqual(scratch.claim_token, self.claim_tokens[scratch.slug])
