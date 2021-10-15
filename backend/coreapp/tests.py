from django.test.testcases import TestCase
from coreapp.m2c_wrapper import M2CWrapper
from coreapp.compiler_wrapper import CompilerWrapper
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

import responses
from time import sleep

from .models import Compilation, Scratch, Profile
from .github import GitHubUser

class ScratchCreationTests(APITestCase):
    def test_accept_late_rodata(self):
        """
        Ensure that .late_rodata (used in ASM_PROCESSOR) is accepted during scratch creation.
        """
        scratch_dict = {
            'arch': 'mips',
            'context': '',
            'target_asm':
""".late_rodata
glabel D_8092C224
/* 000014 8092C224 3DCCCCCD */ .float 0.1

.text
glabel func_80929D04
jr $ra
nop"""
        }

        response = self.client.post(reverse('scratch'), scratch_dict)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scratch.objects.count(), 1)

    def test_n64_func(self):
        """
        Ensure that functions with t6/t7 registers can be assembled.
        """
        scratch_dict = {
            'arch': 'mips',
            'context': '',
            'target_asm':
"""
.text
glabel func_8019B378
lui $t6, %hi(sOcarinaSongAppendPos)
lbu $t6, %lo(sOcarinaSongAppendPos)($t6)
lui $at, %hi(D_801D702C)
jr  $ra
sb  $t6, %lo(D_801D702C)($at)
"""
        }

        response = self.client.post(reverse('scratch'), scratch_dict)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scratch.objects.count(), 1)

class ScratchModificationTests(APITestCase):
    def test_update_scratch_score(self):
        """
        Ensure that a scratch's score gets updated when the code changes.
        """
        scratch_dict = {
            'arch': 'mips',
            'context': '',
            'target_asm': "jr $ra"
        }

        response = self.client.post(reverse('scratch'), scratch_dict)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        scratch = Scratch.objects.first()
        self.assertIsNotNone(scratch)
        assert(scratch is not None)

        slug = scratch.slug

        self.assertEqual(scratch.score, -1)

        # Obtain ownership of the scratch
        response = self.client.post(reverse('scratch-claim', kwargs={'slug': slug}))

        # Update the scratch's code and compiler output
        scratch_patch = {
            'source_code': "int func() { return 2; }",
            'compiler': 'ido5.3'
        }

        response = self.client.patch(reverse('scratch-detail', kwargs={'slug': slug}), scratch_patch)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        scratch = Scratch.objects.first()
        assert(scratch is not None)
        self.assertEqual(scratch.score, 200)

    def test_create_scratch_score(self):
        """
        Ensure that a scratch's score gets set upon creation.
        """
        scratch_dict = {
            'arch': 'mips',
            'compiler': 'ido7.1',
            'context': '',
            'target_asm': 'jr $ra\nli $v0,2',
            'source_code': 'int func() { return 2; }'
        }

        response = self.client.post(reverse('scratch'), scratch_dict)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        scratch = Scratch.objects.first()
        self.assertIsNotNone(scratch)
        assert(scratch is not None)

        self.assertEqual(scratch.score, 0)

class ScratchForkTests(APITestCase):
    def test_fork_scratch(self):
        """
        Ensure that a scratch's fork maintains the relevant properties of its parent
        """
        scratch_dict = {
            'arch': 'mips',
            'context': '',
            'target_asm': 'glabel meow\njr $ra',
            'diff_label': 'meow',
        }

        response = self.client.post(reverse('scratch'), scratch_dict)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        scratch = Scratch.objects.first()
        self.assertIsNotNone(scratch)
        assert(scratch is not None)

        slug = scratch.slug

        fork_dict = {
            'compiler': 'gcc2.8.1',
            'arch': 'mips',
            'cc_opts': '-O2',
            'source_code': 'int func() { return 2; }',
            'context': '',
        }

        # Create a fork of the scratch
        response = self.client.post(reverse('scratch-fork', kwargs={'slug': slug}), fork_dict)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        new_slug = response.json()["slug"]

        scratch = Scratch.objects.get(slug=slug)
        fork = Scratch.objects.get(slug=new_slug)

        # Make sure the diff_label carried over to the fork
        self.assertEqual(scratch.diff_label, fork.diff_label)



class CompilationTests(APITestCase):
    def test_simple_compilation(self):
        """
        Ensure that we can run a simple compilation via the api
        """
        scratch_dict = {
            'arch': 'mips',
            'context': '',
            'target_asm': 'glabel func_80929D04\njr $ra\nnop'
        }

        # Test that we can create a scratch
        response = self.client.post(reverse('scratch'), scratch_dict)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Scratch.objects.count(), 1)

        slug = response.json()["slug"]

        compile_dict = {
            'slug': slug,
            'compiler': 'gcc2.8.1',
            'cc_opts': '-mips2 -O2',
            'source_code': 'int add(int a, int b){\nreturn a + b;\n}\n'
        }

        # Test that we can compile a scratch
        response = self.client.post(reverse("scratch-compile", kwargs={"slug": slug}), compile_dict)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Compilation.objects.count(), 1)

    def test_ido_line_endings(self):
        """
        Ensure that compilations with \\r\\n line endings succeed
        """
        compilation, errors = CompilerWrapper.compile_code("ido5.3", "-mips2 -O2", "int dog = 5;", "extern char libvar1;\r\nextern char libvar2;\r\n")

        if errors:
            self.assertEqual(len(errors.strip()), 0, "There should be no errors or warnings for the compilation:" + errors)

        self.assertIsNotNone(compilation, "The compilation result should be non-null")


class M2CTests(TestCase):
    """
    Ensure that pointers are next to types (left style)
    """
    def test_left_pointer_style(self):
        c_code = M2CWrapper.decompile("""
        glabel func
        li $t6,1
        jr $ra
        sw $t6,0($a0)
        """, "")

        assert c_code is not None, "The decompilation should not fail" # for mypy
        self.assertTrue("s32*" in c_code, "The decompiled c code should have a left-style pointer, was instead:\n" + c_code)


class UserTests(APITestCase):
    current_user_url: str

    GITHUB_USER = {
        "login": "BowserSlug",
        "id": 89422212,
        "node_id": "MDQ6VXNlcjg5NDIyMjEy",
        "avatar_url": "https://avatars.githubusercontent.com/u/89422212?v=4",
        "gravatar_id": "",
        "url": "https://api.github.com/users/BowserSlug",
        "html_url": "https://github.com/BowserSlug",
        "followers_url": "https://api.github.com/users/BowserSlug/followers",
        "following_url": "https://api.github.com/users/BowserSlug/following{/other_user}",
        "gists_url": "https://api.github.com/users/BowserSlug/gists{/gist_id}",
        "starred_url": "https://api.github.com/users/BowserSlug/starred{/owner}{/repo}",
        "subscriptions_url": "https://api.github.com/users/BowserSlug/subscriptions",
        "organizations_url": "https://api.github.com/users/BowserSlug/orgs",
        "repos_url": "https://api.github.com/users/BowserSlug/repos",
        "events_url": "https://api.github.com/users/BowserSlug/events{/privacy}",
        "received_events_url": "https://api.github.com/users/BowserSlug/received_events",
        "type": "User",
        "site_admin": False,
        "name": "Bowser Slug",
        "company": None,
        "blog": "",
        "location": None,
        "email": None,
        "hireable": None,
        "bio": None,
        "twitter_username": None,
        "public_repos": 0,
        "public_gists": 0,
        "followers": 0,
        "following": 0,
        "created_at": "2021-08-23T20:56:16Z",
        "updated_at": "2021-08-23T21:00:04Z"
    }

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.current_user_url = reverse("current-user")

    def test_set_user_profile_middleware(self):
        """
        Ensure that an anonymous profile is created for requests.
        """

        response = self.client.get(self.current_user_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Profile.objects.count(), 1)
        self.assertEqual(User.objects.count(), 0)

    @responses.activate
    def test_github_login(self) -> None:
        """
        Ensure that a user is created upon sign-in with GitHub.
        """

        responses.add(responses.POST, "https://github.com/login/oauth/access_token", json={
            "access_token": "__mock__",
            "scope": "public_repo",
        }, status=200)
        responses.add(responses.GET, "https://api.github.com:443/user", json=self.GITHUB_USER, status=200)
        responses.add(responses.GET, f"https://api.github.com:443/user/{self.GITHUB_USER['id']}", json=self.GITHUB_USER, status=200)

        response = self.client.post(self.current_user_url, {
            "code": "__mock__",
        })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Profile.objects.count(), 1)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(GitHubUser.objects.count(), 1)

    @responses.activate
    def test_github_login_where_exists_already(self):
        """
        Ensure that you can log in to an existing user with GitHub.
        """

        # log in as the user
        self.test_github_login()

        responses.add(responses.POST, "https://github.com/login/oauth/access_token", json={
            "access_token": "__mock__",
            "scope": "public_repo",
        }, status=200)
        responses.add(responses.GET, "https://api.github.com:443/user", json=self.GITHUB_USER, status=200)
        responses.add(responses.GET, f"https://api.github.com:443/user/{self.GITHUB_USER['id']}", json=self.GITHUB_USER, status=200)

        # log in as the user again
        response = self.client.post(self.current_user_url, {
            "code": "__mock__",
        })

        # check there is only one user created
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Profile.objects.count(), 1)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(GitHubUser.objects.count(), 1)

    @responses.activate
    def test_logout(self):
        """
        Ensure that you can log out with POST /user with no data.
        """

        # log in as the user
        self.test_github_login()

        # verify we are logged in
        response = self.client.get(self.current_user_url)
        self.assertEqual(response.json()["is_anonymous"], False)

        self.assertEqual(Profile.objects.count(), 1) # logged-in

        # log out
        response = self.client.post(self.current_user_url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["is_you"], True)
        self.assertEqual(response.json()["is_anonymous"], True)

        self.assertEqual(Profile.objects.count(), 2) # logged-out

        for i in range(3):
            # verify we are logged out
            response = self.client.get(self.current_user_url)
            self.assertEqual(response.json()["is_you"], True)
            self.assertEqual(response.json()["is_anonymous"], True)

        # all the above GETs should have used the same logged-out profile
        self.assertEqual(Profile.objects.count(), 2)

    @responses.activate
    def test_own_scratch(self):
        """
        Create a scratch anonymously, claim it, then log in and verify that the scratch owner is your logged-in user.
        """

        response = self.client.post("/api/scratch", {
            'arch': 'mips',
            'context': '',
            'target_asm': "jr $ra\nnop\n"
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        slug = response.json()["slug"]

        self.test_github_login()

        response = self.client.post(f"/api/scratch/{slug}/claim")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["success"])

        response = self.client.get(f"/api/scratch/{slug}")
        self.assertEqual(response.json()["owner"]["username"], self.GITHUB_USER["login"])
        self.assertEqual(response.json()["owner"]["is_you"], True)

class ScratchDetailTests(APITestCase):
    def make_nop_scratch(self) -> Scratch:
        response = self.client.post(reverse("scratch"), {
            'arch': 'mips',
            'context': '',
            'target_asm': "jr $ra\nnop\n",
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        scratch = Scratch.objects.first()
        assert scratch is not None # assert keyword instead of self.assertIsNotNone for mypy
        return scratch

    def test_404_head(self):
        """
        Ensure that HEAD requests 404 correctly.
        """
        response = self.client.head(reverse("scratch-detail", args=["doesnt_exist"]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_last_modified(self):
        """
        Ensure that the Last-Modified header is set.
        """

        scratch = self.make_nop_scratch()

        response = self.client.head(reverse("scratch-detail", args=[scratch.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assert_(response.headers.get("Last-Modified") is not None)

    def test_if_modified_since(self):
        """
        Ensure that the If-Modified-Since header is handled.
        """

        scratch = self.make_nop_scratch()

        response = self.client.head(reverse("scratch-detail", args=[scratch.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        last_modified = response.headers.get("Last-Modified")

        # should be unmodified
        response = self.client.get(reverse("scratch-detail", args=[scratch.slug]), HTTP_IF_MODIFIED_SINCE=last_modified)
        self.assertEqual(response.status_code, status.HTTP_304_NOT_MODIFIED)

        # Last-Modified is only granular to the second
        sleep(1)

        # touch the scratch
        old_last_updated = scratch.last_updated
        scratch.slug = "newslug"
        scratch.save()
        self.assertNotEqual(scratch.last_updated, old_last_updated)

        # should now be modified
        response = self.client.get(reverse("scratch-detail", args=[scratch.slug]), HTTP_IF_MODIFIED_SINCE=last_modified)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_double_claim(self):
        """
        Create a scratch anonymously, claim it, then verify that claiming it again doesn't work.
        """

        scratch = self.make_nop_scratch()

        self.assertIsNone(scratch.owner)

        response = self.client.post(f"/api/scratch/{scratch.slug}/claim")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["success"])

        response = self.client.post(f"/api/scratch/{scratch.slug}/claim")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.json()["success"])

        updated_scratch = Scratch.objects.first()
        assert updated_scratch is not None
        self.assertIsNotNone(updated_scratch.owner)
