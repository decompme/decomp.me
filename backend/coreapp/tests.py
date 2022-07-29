import tempfile
from time import sleep
from typing import Any, Callable, Dict, Optional
from unittest import skip, skipIf, skipUnless
from unittest.mock import Mock, patch

import responses
from django.contrib.auth.models import User
from django.test.testcases import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from coreapp import compilers, platforms

from coreapp.compiler_wrapper import CompilerWrapper
from coreapp.compilers import (
    Compiler,
    GCC281,
    IDO53,
    IDO71,
    MWCC_247_92,
    MWCPPC_24,
    PBX_GCC3,
)
from coreapp.m2c_wrapper import M2CWrapper
from coreapp.platforms import N64
from coreapp.views.scratch import compile_scratch_update_score
from .models.github import GitHubRepo, GitHubUser

from .models.profile import Profile
from .models.project import Project, ProjectFunction, ProjectImportConfig, ProjectMember
from .models.scratch import CompilerConfig, Scratch


def requiresCompiler(*compilers: Compiler) -> Callable[..., Any]:
    for c in compilers:
        if not c.available():
            return skip(f"Compiler {c.id} not available")
    return skipIf(False, "")


class BaseTestCase(APITestCase):
    # Create a scratch and return it as a DB object
    def create_scratch(self, partial: Dict[str, str]) -> Scratch:
        response = self.client.post(reverse("scratch-list"), partial)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        scratch = Scratch.objects.get(slug=response.json()["slug"])
        assert scratch is not None
        return scratch

    def create_nop_scratch(self) -> Scratch:
        scratch_dict = {
            "compiler": compilers.DUMMY.id,
            "platform": platforms.DUMMY.id,
            "context": "",
            "target_asm": "jr $ra\nnop\n",
        }
        return self.create_scratch(scratch_dict)


class ScratchCreationTests(BaseTestCase):
    @requiresCompiler(IDO71)
    def test_accept_late_rodata(self) -> None:
        """
        Ensure that .late_rodata (used in ASM_PROCESSOR) is accepted during scratch creation.
        """
        scratch_dict = {
            "platform": N64.id,
            "compiler": IDO71.id,
            "context": "",
            "target_asm": """.late_rodata
glabel D_8092C224
.float 0.1

.text
glabel func_80929D04
jr $ra
nop""",
        }
        self.create_scratch(scratch_dict)

    @requiresCompiler(IDO53)
    def test_n64_func(self) -> None:
        """
        Ensure that functions with t6/t7 registers can be assembled.
        """
        scratch_dict = {
            "platform": N64.id,
            "compiler": IDO53.id,
            "context": "typedef unsigned char u8;",
            "target_asm": """
.text
glabel func_8019B378
lui $t6, %hi(sOcarinaSongAppendPos)
lbu $t6, %lo(sOcarinaSongAppendPos)($t6)
lui $at, %hi(D_801D702C)
jr  $ra
sb  $t6, %lo(D_801D702C)($at)
""",
        }
        self.create_scratch(scratch_dict)

    @requiresCompiler(IDO71)
    def test_fpr_reg_names(self) -> None:
        """
        Ensure that functions with O32 register names can be assembled.
        """
        scratch_dict = {
            "platform": N64.id,
            "compiler": IDO71.id,
            "context": "",
            "target_asm": """
glabel test
lui   $at, 0x3ff0
mtc1  $at, $fv1f
mtc1  $zero, $fv1
beqz  $a0, .L00400194
move  $v0, $a0
andi  $a1, $a0, 3
negu  $a1, $a1
beqz  $a1, .L004000EC
addu  $v1, $a1, $a0
mtc1  $v0, $ft0
nop
""",
        }
        self.create_scratch(scratch_dict)

    def test_dummy_platform(self) -> None:
        """
        Ensure that we can create scratches with the dummy platform and compiler
        """
        scratch_dict = {
            "compiler": compilers.DUMMY.id,
            "platform": platforms.DUMMY.id,
            "context": "",
            "target_asm": "this is some test asm",
        }
        self.create_scratch(scratch_dict)

    @requiresCompiler(IDO71)
    def test_max_score(self) -> None:
        """
        Ensure that max_score is available upon scratch creation even if the initial compialtion fails
        """
        scratch_dict = {
            "platform": N64.id,
            "compiler": IDO71.id,
            "context": "this aint cod",
            "target_asm": ".text\nglabel func_80929D04\njr $ra\nnop",
        }
        scratch = self.create_scratch(scratch_dict)
        self.assertEqual(scratch.max_score, 200)


class ScratchModificationTests(BaseTestCase):
    @requiresCompiler(GCC281, IDO53)
    def test_update_scratch_score(self) -> None:
        """
        Ensure that a scratch's score gets updated when the code changes.
        """
        scratch_dict = {
            "platform": N64.id,
            "compiler": GCC281.id,
            "context": "",
            "target_asm": "jr $ra",
        }
        scratch = self.create_scratch(scratch_dict)
        slug = scratch.slug

        self.assertGreater(scratch.score, 0)

        # Obtain ownership of the scratch
        response = self.client.post(reverse("scratch-claim", kwargs={"pk": slug}))

        # Update the scratch's code and compiler output
        scratch_patch = {
            "source_code": "int func() { return 2; }",
            "compiler": IDO53.id,
        }

        response = self.client.patch(
            reverse("scratch-detail", kwargs={"pk": slug}), scratch_patch
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        scratch = Scratch.objects.get(slug=slug)
        assert scratch is not None
        self.assertEqual(scratch.score, 200)

    @requiresCompiler(GCC281)
    def test_update_scratch_score_on_compile_get(self) -> None:
        """
        Ensure that a scratch's score gets updated on a GET to compile
        """
        scratch_dict = {
            "platform": N64.id,
            "compiler": GCC281.id,
            "compiler_flags": "-O2",
            "context": "",
            "target_asm": "jr $ra\nli $v0,2",
            "source_code": "int func() { return 2; }",
        }
        scratch = self.create_scratch(scratch_dict)

        scratch.score = -1
        scratch.max_score = -1
        scratch.save()

        self.assertEqual(scratch.score, -1)
        slug = scratch.slug

        response = self.client.get(reverse("scratch-compile", kwargs={"pk": slug}))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        scratch = Scratch.objects.get(slug=slug)
        assert scratch is not None
        self.assertEqual(scratch.score, 0)

    @requiresCompiler(IDO71)
    def test_create_scratch_score(self) -> None:
        """
        Ensure that a scratch's score gets set upon creation.
        """
        scratch_dict = {
            "platform": N64.id,
            "compiler": IDO71.id,
            "context": "",
            "target_asm": "jr $ra\nli $v0,2",
            "source_code": "int func() { return 2; }",
        }
        scratch = self.create_scratch(scratch_dict)
        self.assertEqual(scratch.score, 0)

    @requiresCompiler(IDO71)
    def test_update_scratch_score_does_not_affect_last_updated(self) -> None:
        """
        Ensure that a scratch's last_updated field does not get updated when the max_score changes.
        """
        scratch_dict = {
            "platform": N64.id,
            "compiler": IDO71.id,
            "context": "",
            "target_asm": "jr $ra\nli $v0,2",
            "source_code": "int func() { return 2; }",
        }
        scratch = self.create_scratch(scratch_dict)
        scratch.max_score = -1
        scratch.save()
        self.assertEqual(scratch.max_score, -1)

        prev_last_updated = scratch.last_updated
        compile_scratch_update_score(scratch)
        self.assertEqual(scratch.max_score, 200)
        self.assertEqual(prev_last_updated, scratch.last_updated)


class ScratchForkTests(BaseTestCase):
    def test_fork_scratch(self) -> None:
        """
        Ensure that a scratch's fork maintains the relevant properties of its parent
        """
        scratch_dict = {
            "compiler": platforms.DUMMY.id,
            "platform": compilers.DUMMY.id,
            "context": "",
            "target_asm": "glabel meow\njr $ra",
            "diff_label": "meow",
            "name": "cat scratch",
        }

        project = ProjectTests.create_test_project()

        compiler_config = CompilerConfig()
        compiler_config.save()

        config = ProjectImportConfig(compiler_config=compiler_config, project=project)
        config.save()

        project_function = ProjectFunction(
            display_name="howdy",
            rom_address=1000,
            import_config=config,
            project=project,
        )
        project_function.save()

        scratch = self.create_scratch(scratch_dict)
        scratch.project_function = project_function
        scratch.save()

        slug = scratch.slug

        fork_dict = {
            "compiler": platforms.DUMMY.id,
            "platform": compilers.DUMMY.id,
            "compiler_flags": "-O2",
            "source_code": "int func() { return 2; }",
            "context": "",
        }

        # Create a fork of the scratch
        response = self.client.post(
            reverse("scratch-fork", kwargs={"pk": slug}), fork_dict
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        new_slug = response.json()["slug"]

        scratch = Scratch.objects.get(slug=slug)
        fork = Scratch.objects.get(slug=new_slug)

        # Make sure the diff_label carried over to the fork
        self.assertEqual(scratch.diff_label, fork.diff_label)

        # Make sure the name carried over to the fork
        self.assertEqual(scratch.name, fork.name)

        # Make sure the project_function carried over to the fork
        self.assertEqual(scratch.project_function, fork.project_function)


class CompilationTests(BaseTestCase):
    @requiresCompiler(GCC281)
    def test_simple_compilation(self) -> None:
        """
        Ensure that we can run a simple compilation via the api
        """
        scratch_dict = {
            "compiler": GCC281.id,
            "platform": N64.id,
            "context": "",
            "target_asm": "glabel func_80929D04\njr $ra\nnop",
        }

        # Test that we can create a scratch
        scratch = self.create_scratch(scratch_dict)

        compile_dict = {
            "slug": scratch.slug,
            "compiler": GCC281.id,
            "compiler_flags": "-mips2 -O2",
            "source_code": "int add(int a, int b){\nreturn a + b;\n}\n",
        }

        # Test that we can compile a scratch
        response = self.client.post(
            reverse("scratch-compile", kwargs={"pk": scratch.slug}), compile_dict
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @requiresCompiler(GCC281)
    def test_giant_compilation(self) -> None:
        """
        Ensure that we can compile a giant file
        """
        scratch_dict = {
            "compiler": GCC281.id,
            "platform": N64.id,
            "context": "",
            "target_asm": "glabel func_80929D04\njr $ra\nnop",
        }

        # Test that we can create a scratch
        scratch = self.create_scratch(scratch_dict)

        context = ""
        for i in range(25000):
            context += "extern int test_symbol_to_be_used_in_a_test;\n"

        compile_dict = {
            "slug": scratch.slug,
            "compiler": GCC281.id,
            "compiler_flags": "-mips2 -O2",
            "source_code": "int add(int a, int b){\nreturn a + b;\n}\n",
            "context": context,
        }

        # Test that we can compile a scratch
        response = self.client.post(
            reverse("scratch-compile", kwargs={"pk": scratch.slug}), compile_dict
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(len(response.json()["errors"]), 0)

    @requiresCompiler(IDO53)
    def test_ido_line_endings(self) -> None:
        """
        Ensure that compilations with \\r\\n line endings succeed
        """
        result = CompilerWrapper.compile_code(
            IDO53,
            "-mips2 -O2",
            "int dog = 5;",
            "extern char libvar1;\r\nextern char libvar2;\r\n",
        )
        self.assertGreater(
            len(result.elf_object), 0, "The compilation result should be non-null"
        )

    @requiresCompiler(IDO53)
    def test_ido_kpic(self) -> None:
        """
        Ensure that ido compilations including -KPIC produce different code
        """
        result_non_shared = CompilerWrapper.compile_code(
            IDO53, "-mips2 -O2", "int dog = 5;", ""
        )
        result_kpic = CompilerWrapper.compile_code(
            IDO53, "-mips2 -O2 -KPIC", "int dog = 5;", ""
        )
        self.assertNotEqual(
            result_non_shared.elf_object,
            result_kpic.elf_object,
            "The compilation result should be different",
        )

    @requiresCompiler(IDO71)
    def test_fpr_reg_names_output(self) -> None:
        """
        Ensure that we can view fpr reg names by passing the appropriate diff flag
        """
        scratch_dict = {
            "platform": N64.id,
            "compiler": IDO71.id,
            "diff_flags": '["-Mreg-names=32"]',
            "context": "",
            "target_asm": """
glabel test
lui   $at, 0x3ff0
mtc1  $at, $fv1f
mtc1  $zero, $fv1
beqz  $a0, .L00400194
move  $v0, $a0
andi  $a1, $a0, 3
negu  $a1, $a1
beqz  $a1, .L004000EC
addu  $v1, $a1, $a0
mtc1  $v0, $ft0
nop
""",
        }
        scratch = self.create_scratch(scratch_dict)

        # Test that we can compile a scratch
        response = self.client.post(
            reverse("scratch-compile", kwargs={"pk": scratch.slug})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()["errors"]), 0)
        # Confirm the output contains the expected fpr reg names
        self.assertTrue("fv1f" in str(response.json()))

        response = self.client.post(
            reverse("scratch-compile", kwargs={"pk": scratch.slug}),
            {"diff_flags": "[]"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()["errors"]), 0)
        # Confirm the output does not contain the expected fpr reg names
        self.assertFalse("fv1f" in str(response.json()))

    @requiresCompiler(MWCPPC_24)
    def test_mac_mwcc(self) -> None:
        """
        Ensure that we can invoke the MACOS9 compiler
        """
        result = CompilerWrapper.compile_code(
            MWCPPC_24,
            "-str reuse -inline on -O0",
            "int func(void) { return 5; }",
            "extern char libvar1;\r\nextern char libvar2;\r\n",
        )
        self.assertGreater(
            len(result.elf_object), 0, "The compilation result should be non-null"
        )

    @requiresCompiler(PBX_GCC3)
    def test_pbx_gcc3(self) -> None:
        """
        Ensure that we can invoke the PowerPC GCC3 cross-compiler
        """
        result = CompilerWrapper.compile_code(
            PBX_GCC3,
            "-std=c99 -fPIC -O0 -g3",
            "int func(void) { float f = 5.0; return f; }",  # test if floats are handled correctly
            "extern char libvar1;\r\nextern char libvar2;\r\n",
        )
        self.assertGreater(
            len(result.elf_object), 0, "The compilation result should be non-null"
        )

    @requiresCompiler(MWCC_247_92)
    def test_mwcc_wibo(self) -> None:
        """
        Ensure that we can invoke mwcc through WiBo
        """
        result = CompilerWrapper.compile_code(
            MWCC_247_92,
            "-str reuse -inline on -fp off -O0",
            "int func(void) { return 5; }",
            "extern char libvar1;\r\nextern char libvar2;\r\n",
        )
        self.assertGreater(
            len(result.elf_object), 0, "The compilation result should be non-null"
        )

    def test_dummy_compiler(self) -> None:
        """
        Ensure basic functionality works for the dummy compiler
        """

        result = CompilerWrapper.compile_code(
            compilers.DUMMY, "", "sample text 123", ""
        )
        self.assertGreater(
            len(result.elf_object), 0, "The compilation result should be non-null"
        )


class DecompilationTests(BaseTestCase):
    @requiresCompiler(GCC281)
    def test_default_decompilation(self) -> None:
        """
        Ensure that a scratch's initial decompilation makes sense
        """
        scratch_dict = {
            "compiler": GCC281.id,
            "platform": N64.id,
            "context": "",
            "target_asm": "glabel return_2\njr $ra\nli $v0,2",
        }
        scratch = self.create_scratch(scratch_dict)
        self.assertEqual(scratch.source_code, "? return_2(void) {\n    return 2;\n}\n")

    @requiresCompiler(GCC281)
    def test_decompile_endpoint(self) -> None:
        """
        Ensure that the decompile endpoint works
        """
        scratch_dict = {
            "compiler": GCC281.id,
            "platform": N64.id,
            "context": "typedef int s32;",
            "target_asm": "glabel return_2\njr $ra\nli $v0,2",
        }
        scratch = self.create_scratch(scratch_dict)

        response = self.client.post(
            reverse("scratch-decompile", kwargs={"pk": scratch.slug})
        )
        self.assertEqual(
            response.json()["decompilation"], "? return_2(void) {\n    return 2;\n}\n"
        )

        # Provide context and see that the decompilation changes
        response = self.client.post(
            reverse("scratch-decompile", kwargs={"pk": scratch.slug}),
            data={"context": "s32 return_2(void);"},
        )
        self.assertEqual(
            response.json()["decompilation"], "s32 return_2(void) {\n    return 2;\n}\n"
        )


class M2CTests(TestCase):
    """
    Ensure that pointers are next to types (left style)
    """

    def test_left_pointer_style(self) -> None:
        c_code = M2CWrapper.decompile(
            """
        glabel func
        li $t6,1
        jr $ra
        sw $t6,0($a0)
        """,
            "",
            IDO53,
            "mips",
        )

        self.assertTrue(
            "s32*" in c_code,
            "The decompiled c code should have a left-style pointer, was instead:\n"
            + c_code,
        )

    """
    Ensure that we can decompile ppc code
    """

    def test_ppc(self) -> None:
        c_code = M2CWrapper.decompile(
            """
        .global func_800B43A8
        func_800B43A8:
        xor r0, r3, r3
        subf r3, r4, r0
        blr
        """,
            "",
            MWCC_247_92,
            "ppc",
        )

        self.assertEqual(
            "s32 func_800B43A8(s32 arg0, s32 arg1) {\n    return (arg0 ^ arg0) - arg1;\n}\n",
            c_code,
        )


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
        "updated_at": "2021-08-23T21:00:04Z",
    }

    @classmethod
    def setUpClass(cls) -> None:
        super().setUpClass()
        cls.current_user_url = reverse("current-user")

    def test_set_user_profile_middleware(self) -> None:
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

        responses.add(
            responses.POST,
            "https://github.com/login/oauth/access_token",
            json={
                "access_token": "__mock__",
                "scope": "public_repo",
            },
            status=200,
        )
        responses.add(
            responses.GET,
            "https://api.github.com:443/user",
            json=self.GITHUB_USER,
            status=200,
        )
        responses.add(
            responses.GET,
            f"https://api.github.com:443/user/{self.GITHUB_USER['id']}",
            json=self.GITHUB_USER,
            status=200,
        )

        response = self.client.post(
            self.current_user_url,
            {
                "code": "__mock__",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Profile.objects.count(), 1)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(GitHubUser.objects.count(), 1)

    @responses.activate
    def test_github_login_where_exists_already(self) -> None:
        """
        Ensure that you can log in to an existing user with GitHub.
        """

        # log in as the user
        self.test_github_login()

        responses.add(
            responses.POST,
            "https://github.com/login/oauth/access_token",
            json={
                "access_token": "__mock__",
                "scope": "public_repo",
            },
            status=200,
        )
        responses.add(
            responses.GET,
            "https://api.github.com:443/user",
            json=self.GITHUB_USER,
            status=200,
        )
        responses.add(
            responses.GET,
            f"https://api.github.com:443/user/{self.GITHUB_USER['id']}",
            json=self.GITHUB_USER,
            status=200,
        )

        # log in as the user again
        response = self.client.post(
            self.current_user_url,
            {
                "code": "__mock__",
            },
        )

        # check there is only one user created
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Profile.objects.count(), 1)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(GitHubUser.objects.count(), 1)

    @responses.activate
    def test_logout(self) -> None:
        """
        Ensure that you can log out with POST /user with no data.
        """

        # log in as the user
        self.test_github_login()

        # verify we are logged in
        response = self.client.get(self.current_user_url)
        self.assertEqual(response.json()["is_anonymous"], False)

        self.assertEqual(Profile.objects.count(), 1)  # logged-in

        # log out
        response = self.client.post(self.current_user_url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["is_you"], True)
        self.assertEqual(response.json()["is_anonymous"], True)

        self.assertEqual(Profile.objects.count(), 2)  # logged-out

        for i in range(3):
            # verify we are logged out
            response = self.client.get(self.current_user_url)
            self.assertEqual(response.json()["is_you"], True)
            self.assertEqual(response.json()["is_anonymous"], True)

        # all the above GETs should have used the same logged-out profile
        self.assertEqual(Profile.objects.count(), 2)

    @responses.activate
    def test_own_scratch(self) -> None:
        """
        Create a scratch anonymously, claim it, then log in and verify that the scratch owner is your logged-in user.
        Finally, delete the scratch.
        """
        response = self.client.post(
            "/api/scratch",
            {
                "compiler": compilers.DUMMY.id,
                "platform": platforms.DUMMY.id,
                "context": "",
                "target_asm": "jr $ra\nnop\n",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        slug = response.json()["slug"]

        self.test_github_login()

        response = self.client.post(f"/api/scratch/{slug}/claim")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["success"])

        response = self.client.get(f"/api/scratch/{slug}")
        self.assertEqual(
            response.json()["owner"]["username"], self.GITHUB_USER["login"]
        )
        self.assertEqual(response.json()["owner"]["is_you"], True)

        # Delete the scratch
        url = reverse("scratch-detail", kwargs={"pk": slug})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    @responses.activate
    def test_cant_delete_scratch(self) -> None:
        """
        Ensure we can't delete a scratch we don't own
        """

        # Create a scratch, log in, and claim it
        response = self.client.post(
            "/api/scratch",
            {
                "compiler": compilers.DUMMY.id,
                "platform": platforms.DUMMY.id,
                "context": "",
                "target_asm": "jr $ra\nnop\n",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        slug = response.json()["slug"]

        self.test_github_login()

        response = self.client.post(f"/api/scratch/{slug}/claim")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["success"])

        response = self.client.get(f"/api/scratch/{slug}")
        self.assertEqual(
            response.json()["owner"]["username"], self.GITHUB_USER["login"]
        )
        self.assertEqual(response.json()["owner"]["is_you"], True)

        # Log out
        response = self.client.post(self.current_user_url, {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["is_you"], True)
        self.assertEqual(response.json()["is_anonymous"], True)

        # Try to delete the scratch
        url = reverse("scratch-detail", kwargs={"pk": slug})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Log in again
        self.test_github_login()

        # Successfully delete the scratch
        url = reverse("scratch-detail", kwargs={"pk": slug})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)


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
        self.assert_(response.headers.get("Last-Modified") is not None)

    def test_if_modified_since(self) -> None:
        """
        Ensure that the If-Modified-Since header is handled.
        """
        scratch = self.create_nop_scratch()

        response = self.client.head(reverse("scratch-detail", args=[scratch.slug]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        last_modified = response.headers.get("Last-Modified")

        # should be unmodified
        response = self.client.get(
            reverse("scratch-detail", args=[scratch.slug]),
            HTTP_IF_MODIFIED_SINCE=last_modified,
        )
        self.assertEqual(response.status_code, status.HTTP_304_NOT_MODIFIED)

        # Last-Modified is only granular to the second
        sleep(1)

        # touch the scratch
        old_last_updated = scratch.last_updated
        scratch.slug = "newslug"
        scratch.save()
        self.assertNotEqual(scratch.last_updated, old_last_updated)

        # should now be modified
        response = self.client.get(
            reverse("scratch-detail", args=[scratch.slug]),
            HTTP_IF_MODIFIED_SINCE=last_modified,
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_double_claim(self) -> None:
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

    def test_family(self) -> None:
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

    def test_family_order(self) -> None:
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

    def test_family_etag(self) -> None:
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
    def test_create_profile(self) -> None:
        """
        Ensure that we create a profile for a normal request
        """

        response = self.client.get(reverse("compilers"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(Profile.objects.count(), 1)

    def test_node_fetch_request(self) -> None:
        """
        Ensure that we don't create profiles for node-fetch requests (SSR)
        """

        response = self.client.get(reverse("compilers"), HTTP_USER_AGENT="node-fetch")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertEqual(Profile.objects.count(), 0)


class ProjectTests(TestCase):
    @staticmethod
    def create_test_project(slug: str = "test") -> Project:
        repo = GitHubRepo(
            owner="decompme",
            repo="example-project",
            branch="not_a_real_branch",
        )
        repo.save()

        project = Project(
            slug=slug,
            repo=repo,
            icon_url="http://example.com",
        )
        project.save()

        return project

    def fake_clone_test_repo(self, repo: GitHubRepo) -> None:
        with patch("coreapp.models.github.subprocess.run"):
            repo.pull()

    @patch("coreapp.models.github.subprocess.run")
    @patch("pathlib.Path.mkdir")
    @patch("pathlib.Path.exists")
    def test_create_repo_dir(
        self, mock_exists: Mock, mock_mkdir: Mock, mock_subprocess: Mock
    ) -> None:
        """
        Test that the repo is cloned into a directory
        """
        mock_exists.return_value = False
        project = ProjectTests.create_test_project()
        project.repo.pull()

        mock_subprocess.assert_called_once()
        self.assertListEqual(
            mock_subprocess.call_args.args[0][:3],
            ["git", "clone", "https://github.com/decompme/example-project"],
        )
        mock_mkdir.assert_called_once_with(parents=True)

    @patch("coreapp.models.github.GitHubRepo.get_dir")
    @patch("coreapp.models.github.shutil.rmtree")
    def test_delete_repo_dir(self, mock_rmtree: Mock, mock_get_dir: Mock) -> None:
        """
        Test that the repo's directory is deleted when the repo is
        """
        project = ProjectTests.create_test_project()
        mock_dir = Mock(exists=lambda: True)
        mock_get_dir.return_value = mock_dir
        project.delete()
        project.repo.delete()
        mock_rmtree.assert_called_once_with(mock_dir)

    def test_import_function(self) -> None:
        with tempfile.TemporaryDirectory() as local_files_dir:
            with self.settings(LOCAL_FILE_DIR=local_files_dir):
                project = ProjectTests.create_test_project()

                # add some asm
                dir = project.repo.get_dir()
                (dir / "asm" / "nonmatchings" / "section").mkdir(parents=True)
                (dir / "src").mkdir(parents=True)
                asm_file = dir / "asm" / "nonmatchings" / "section" / "test.s"
                with asm_file.open("w") as f:
                    f.writelines(
                        [
                            "glabel test\n",
                            "jr $ra\n",
                            "nop\n",
                        ]
                    )
                with (dir / "src" / "section.c").open("w") as f:
                    f.writelines(
                        [
                            "typedef int s32;\n",
                        ]
                    )
                with (dir / "symbol_addrs.txt").open("w") as f:
                    f.writelines(
                        [
                            "test = 0x80240000; // type:func rom:0x1000\n",
                        ]
                    )

                # configure the import
                compiler_config = CompilerConfig(
                    platform=platforms.DUMMY.id,
                    compiler=compilers.DUMMY.id,
                    compiler_flags="",
                )
                compiler_config.save()
                import_config = ProjectImportConfig(
                    project=project,
                    display_name="test",
                    compiler_config=compiler_config,
                    src_dir="src",
                    nonmatchings_dir="asm/nonmatchings",
                    nonmatchings_glob="**/*.s",
                    symbol_addrs_path="symbol_addrs.txt",
                )
                import_config.save()

                # import the function
                self.assertEqual(ProjectFunction.objects.count(), 0)
                project.import_functions()
                self.assertEqual(ProjectFunction.objects.count(), 1)

                pf = ProjectFunction.objects.first()

                assert pf is not None
                self.assertFalse(pf.is_matched_in_repo)

                # create a scratch from the function
                fn: Optional[ProjectFunction] = ProjectFunction.objects.first()
                assert fn is not None

                scratch = fn.create_scratch()
                self.assertEqual(scratch.platform, compiler_config.platform)
                self.assertEqual(scratch.compiler, compiler_config.compiler)
                self.assertEqual(scratch.compiler_flags, compiler_config.compiler_flags)
                self.assertEqual(scratch.project_function, fn)

                # match the function (by deleting the asm) and verify it is marked as matching
                asm_file.unlink()
                project.import_functions()
                self.assertEqual(ProjectFunction.objects.count(), 1)

                pf = ProjectFunction.objects.first()
                assert pf is not None

                self.assertTrue(pf.is_matched_in_repo)

    def test_put_project_permissions(self) -> None:
        with tempfile.TemporaryDirectory() as local_files_dir:
            with self.settings(LOCAL_FILE_DIR=local_files_dir):
                project = ProjectTests.create_test_project()

                # try, and fail
                response = self.client.patch(
                    reverse("project-detail", args=[project.slug]),
                    {
                        "description": "new description",
                    },
                    content_type="application/json",
                )
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

                p = Project.objects.first()
                assert p is not None
                self.assertNotEqual(p.description, "new description")

                # add project member
                profile = Profile.objects.first()
                ProjectMember(project=project, profile=profile).save()

                # try again
                response = self.client.patch(
                    reverse("project-detail", args=[project.slug]),
                    {
                        "description": "new description",
                    },
                    content_type="application/json",
                )
                self.assertEqual(response.status_code, status.HTTP_200_OK)

                p = Project.objects.first()
                assert p is not None
                self.assertEqual(p.description, "new description")
