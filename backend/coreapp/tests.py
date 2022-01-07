from django.test.testcases import TestCase
from coreapp.m2c_wrapper import M2CWrapper
from coreapp.compiler_wrapper import CompilerWrapper
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from unittest import skipIf

import responses
from time import sleep

from .models import Scratch, Profile
from .github import GitHubUser

def requiresCompiler(*compiler_ids: str):
    available = CompilerWrapper.available_compiler_ids()

    for id in compiler_ids:
        if id not in available:
            return skipIf(True, f"Compiler {id} not available")

    return skipIf(False, "")


class BaseTestCase(APITestCase):
    # Create a scratch and return it as a DB object
    def create_scratch(self, partial: dict[str, str]) -> Scratch:
        response = self.client.post(reverse('scratch-list'), partial)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        scratch = Scratch.objects.get(slug=response.json()["slug"])
        assert scratch is not None
        return scratch

    def create_nop_scratch(self) -> Scratch:
        scratch_dict = {
            'compiler': 'dummy',
            'platform': 'dummy',
            'context': '',
            'target_asm': "jr $ra\nnop\n",
        }
        return self.create_scratch(scratch_dict)


class ScratchCreationTests(BaseTestCase):
    @requiresCompiler('ido7.1')
    def test_accept_late_rodata(self):
        """
        Ensure that .late_rodata (used in ASM_PROCESSOR) is accepted during scratch creation.
        """
        scratch_dict = {
            'platform': 'n64',
            'compiler': 'ido7.1',
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
        self.create_scratch(scratch_dict)

    @requiresCompiler('ido5.3')
    def test_n64_func(self):
        """
        Ensure that functions with t6/t7 registers can be assembled.
        """
        scratch_dict = {
            'platform': 'n64',
            'compiler': 'ido5.3',
            'context': 'typedef unsigned char u8;',
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
        self.create_scratch(scratch_dict)

    def test_dummy_platform(self):
        """
        Ensure that we can create scratches with the dummy platform and compiler
        """
        scratch_dict = {
            'platform': 'dummy',
            'compiler': 'dummy',
            'context': 'typedef unsigned char u8;',
            'target_asm': 'this is some test asm',
        }
        self.create_scratch(scratch_dict)


class ScratchModificationTests(BaseTestCase):
    @requiresCompiler('gcc2.8.1', 'ido5.3')
    def test_update_scratch_score(self):
        """
        Ensure that a scratch's score gets updated when the code changes.
        """
        scratch_dict = {
            'compiler': 'gcc2.8.1',
            'platform': 'n64',
            'context': '',
            'target_asm': "jr $ra"
        }
        scratch = self.create_scratch(scratch_dict)
        slug = scratch.slug

        self.assertGreater(scratch.score, 0)

        # Obtain ownership of the scratch
        response = self.client.post(reverse('scratch-claim', kwargs={'pk': slug}))

        # Update the scratch's code and compiler output
        scratch_patch = {
            'source_code': "int func() { return 2; }",
            'compiler': 'ido5.3'
        }

        response = self.client.patch(reverse('scratch-detail', kwargs={'pk': slug}), scratch_patch)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        scratch = Scratch.objects.get(slug=slug)
        assert(scratch is not None)
        self.assertEqual(scratch.score, 200)

    @requiresCompiler('gcc2.8.1')
    def test_update_scratch_score_on_compile_get(self):
        """
        Ensure that a scratch's score gets updated on a GET to compile
        """
        scratch_dict = {
            'compiler': 'gcc2.8.1',
            'compiler_flags': '-O2',
            'platform': 'n64',
            'context': '',
            'target_asm': 'jr $ra\nli $v0,2',
            'source_code': 'int func() { return 2; }'
        }
        scratch = self.create_scratch(scratch_dict)

        scratch.score = -1
        scratch.max_score = -1
        scratch.save()

        self.assertEqual(scratch.score, -1)
        slug = scratch.slug

        response = self.client.get(reverse('scratch-compile', kwargs={'pk': slug}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        scratch = Scratch.objects.get(slug=slug)
        assert(scratch is not None)
        self.assertEqual(scratch.score, 0)

    @requiresCompiler('ido7.1')
    def test_create_scratch_score(self):
        """
        Ensure that a scratch's score gets set upon creation.
        """
        scratch_dict = {
            'platform': 'n64',
            'compiler': 'ido7.1',
            'context': '',
            'target_asm': 'jr $ra\nli $v0,2',
            'source_code': 'int func() { return 2; }'
        }
        scratch = self.create_scratch(scratch_dict)
        self.assertEqual(scratch.score, 0)


class ScratchForkTests(BaseTestCase):
    def test_fork_scratch(self):
        """
        Ensure that a scratch's fork maintains the relevant properties of its parent
        """
        scratch_dict = {
            'compiler': 'dummy',
            'platform': 'dummy',
            'context': '',
            'target_asm': 'glabel meow\njr $ra',
            'diff_label': 'meow',
            'name': 'cat scratch',
        }
        scratch = self.create_scratch(scratch_dict)

        slug = scratch.slug

        fork_dict = {
            'compiler': 'dummy',
            'platform': 'dummy',
            'compiler_flags': '-O2',
            'source_code': 'int func() { return 2; }',
            'context': '',
        }

        # Create a fork of the scratch
        response = self.client.post(reverse('scratch-fork', kwargs={'pk': slug}), fork_dict)
        print(response.json())
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        new_slug = response.json()["slug"]

        scratch = Scratch.objects.get(slug=slug)
        fork = Scratch.objects.get(slug=new_slug)

        # Make sure the diff_label carried over to the fork
        self.assertEqual(scratch.diff_label, fork.diff_label)

        # Make sure the name carried over to the fork
        self.assertEqual(scratch.name, fork.name)


class CompilationTests(BaseTestCase):
    @requiresCompiler('gcc2.8.1')
    def test_simple_compilation(self):
        """
        Ensure that we can run a simple compilation via the api
        """
        scratch_dict = {
            'compiler': 'gcc2.8.1',
            'platform': 'n64',
            'context': '',
            'target_asm': 'glabel func_80929D04\njr $ra\nnop'
        }

        # Test that we can create a scratch
        scratch = self.create_scratch(scratch_dict)

        compile_dict = {
            'slug': scratch.slug,
            'compiler': 'gcc2.8.1',
            'compiler_flags': '-mips2 -O2',
            'source_code': 'int add(int a, int b){\nreturn a + b;\n}\n'
        }

        # Test that we can compile a scratch
        response = self.client.post(reverse("scratch-compile", kwargs={'pk': scratch.slug}), compile_dict)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @requiresCompiler('gcc2.8.1')
    def test_giant_compilation(self):
        """
        Ensure that we can compile a giant file
        """
        scratch_dict = {
            'compiler': 'gcc2.8.1',
            'platform': 'n64',
            'context': '',
            'target_asm': 'glabel func_80929D04\njr $ra\nnop'
        }

        # Test that we can create a scratch
        scratch = self.create_scratch(scratch_dict)

        context = ""
        for i in range(25000):
            context += "extern int test_symbol_to_be_used_in_a_test;\n"

        compile_dict = {
            'slug': scratch.slug,
            'compiler': 'gcc2.8.1',
            'compiler_flags': '-mips2 -O2',
            'source_code': 'int add(int a, int b){\nreturn a + b;\n}\n',
            'context': context,
        }

        # Test that we can compile a scratch
        response = self.client.post(reverse("scratch-compile", kwargs={'pk': scratch.slug}), compile_dict)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(len(response.json()["errors"]), 0)

    @requiresCompiler('ido5.3')
    def test_ido_line_endings(self):
        """
        Ensure that compilations with \\r\\n line endings succeed
        """
        result = CompilerWrapper.compile_code("ido5.3", "-mips2 -O2", "int dog = 5;", "extern char libvar1;\r\nextern char libvar2;\r\n")
        self.assertGreater(len(result.elf_object), 0, "The compilation result should be non-null")

    @requiresCompiler('mwcc_247_92')
    def test_mwcc_wine(self):
        """
        Ensure that we can invoke mwcc through wine
        """
        result = CompilerWrapper.compile_code("mwcc_247_92", "-str reuse -inline on -fp off -O0", "int func(void) { return 5; }", "extern char libvar1;\r\nextern char libvar2;\r\n")
        self.assertGreater(len(result.elf_object), 0, "The compilation result should be non-null")

    def test_dummy_compiler(self):
        """
        Ensure basic functionality works for the dummy compiler
        """

        result = CompilerWrapper.compile_code("dummy", "", "sample text 123", "")
        self.assertGreater(len(result.elf_object), 0, "The compilation result should be non-null")


class DecompilationTests(BaseTestCase):
    def test_default_decompilation(self):
        """
        Ensure that a scratch's initial decompilation makes sense
        """
        scratch_dict = {
            'compiler': 'gcc2.8.1',
            'platform': 'n64',
            'context': '',
            'target_asm': 'glabel return_2\njr $ra\nli $v0,2',
        }
        scratch = self.create_scratch(scratch_dict)
        self.assertEqual(scratch.source_code, "? return_2(void) {\n    return 2;\n}\n")

    def test_decompile_endpoint(self):
        """
        Ensure that the decompile endpoint works
        """
        scratch_dict = {
            'compiler': 'gcc2.8.1',
            'platform': 'n64',
            'context': 'typedef int s32;',
            'target_asm': 'glabel return_2\njr $ra\nli $v0,2',
        }
        scratch = self.create_scratch(scratch_dict)

        response = self.client.post(reverse("scratch-decompile", kwargs={'pk': scratch.slug}))
        self.assertEqual(response.json()["decompilation"], "? return_2(void) {\n    return 2;\n}\n")

        # Provide context and see that the decompilation changes
        response = self.client.post(reverse("scratch-decompile", kwargs={'pk': scratch.slug}), data={"context": "s32 return_2(void);"})
        self.assertEqual(response.json()["decompilation"], "s32 return_2(void) {\n    return 2;\n}\n")


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
        """, "", "")

        self.assertTrue("s32*" in c_code, "The decompiled c code should have a left-style pointer, was instead:\n" + c_code)


class UserTests(BaseTestCase):
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
            'compiler': 'dummy',
            'platform': 'dummy',
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


class ScratchDetailTests(BaseTestCase):
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

        scratch = self.create_nop_scratch()

        response = self.client.head(reverse("scratch-detail", args=[scratch.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assert_(response.headers.get("Last-Modified") is not None)

    def test_if_modified_since(self):
        """
        Ensure that the If-Modified-Since header is handled.
        """
        scratch = self.create_nop_scratch()

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
        scratch = self.create_nop_scratch()

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

    def test_family(self):
        root = self.create_nop_scratch()

        # verify the family only holds root
        response = self.client.get(reverse("scratch-family", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["html_url"], root.get_html_url())

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
        fork2: Scratch = Scratch.objects.get(slug=response.json()["slug"])

        # verify the family holds all three
        response = self.client.get(reverse("scratch-family", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 3)

    def test_family_order(self):
        root = self.create_nop_scratch()

        # fork the root
        response = self.client.post(reverse("scratch-fork", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        fork = response.json()

        # verify the family holds both, in creation order
        response = self.client.get(reverse("scratch-family", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 2)
        self.assertEqual(response.json()[0]["html_url"], root.get_html_url())
        self.assertEqual(response.json()[1]["html_url"], fork["html_url"])

    def test_family_etag(self):
        root = self.create_nop_scratch()

        # get etag of only the root
        response = self.client.get(reverse("scratch-family", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        etag = response.headers.get("Etag")
        self.assertIsNotNone(etag)

        # fork the root
        response = self.client.post(reverse("scratch-fork", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # verify etag has changed
        response = self.client.get(reverse("scratch-family", args=[root.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotEqual(etag, response.headers.get("Etag"))

class RequestTests(APITestCase):
    def test_create_profile(self):
        """
        Ensure that we create a profile for a normal request
        """

        response = self.client.get(reverse('compilers'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(Profile.objects.count(), 1)

    def test_node_fetch_request(self):
        """
        Ensure that we don't create profiles for node-fetch requests (SSR)
        """

        response = self.client.get(reverse('compilers'), HTTP_USER_AGENT='node-fetch')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(Profile.objects.count(), 0)
