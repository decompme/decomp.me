from time import sleep
from typing import Any, Dict
import io
import zipfile

from coreapp import compilers, platforms
from coreapp.compilers import GCC281PM, IDO53, IDO71, MWCC_242_81, EE_GCC29_991111
from coreapp.models.scratch import Assembly, Context, Scratch
from coreapp.platforms import GC_WII, N64
from coreapp.tests.common import BaseTestCase, requiresCompiler
from coreapp.views.scratch import compile_scratch_update_score
from django.db.models import ProtectedError
from django.urls import reverse
from rest_framework import status


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
        Ensure that max_score is available upon scratch creation even if the initial compilation fails
        """
        scratch_dict = {
            "platform": N64.id,
            "compiler": IDO71.id,
            "context": "this aint cod",
            "target_asm": ".text\nglabel func_80929D04\njr $ra\nnop",
        }
        scratch = self.create_scratch(scratch_dict)
        self.assertEqual(scratch.max_score, 200)

    @requiresCompiler(IDO71)
    def test_import_scratch(self) -> None:
        """
        Ensure that creating a scratch created via permuter import.py is successful
        """
        scratch_dict = {
            "name": "imported_function",
            "target_asm": ".text\nglabel imported_function\njr $ra\nnop",
            "context": "/* context */",
            "source_code": "void imported_function(void) {}",
            "compiler": IDO71.id,
            "compiler_flags": "-O2",
            "diff_label": "imported_function",
        }
        scratch = self.create_scratch(scratch_dict)
        self.assertEqual(scratch.name, "imported_function")

    @requiresCompiler(MWCC_242_81)
    def test_mwcc_242_81(self) -> None:
        """
        Ensure that MWCC works
        """
        scratch_dict = {
            "platform": GC_WII.id,
            "compiler": MWCC_242_81.id,
            "context": "",
            "target_asm": ".fn somefunc, local\nblr\n.endfn somefunc",
        }
        self.create_scratch(scratch_dict)

    @requiresCompiler(EE_GCC29_991111)
    def test_ps2_platform(self) -> None:
        """
        Ensure that we can create scratches with the ps2 platform and compiler
        """
        scratch_dict = {
            "platform": platforms.PS2.id,
            "compiler": compilers.EE_GCC29_991111.id,
            "context": "",
            "target_asm": "jr $ra\nnop",
        }
        self.create_scratch(scratch_dict)


class ScratchContextTests(BaseTestCase):

    def create_scratch_with_context(self, context: str = "") -> Dict[str, Any]:
        scratch_dict: Dict[str, Any] = {
            "compiler": platforms.DUMMY.id,
            "platform": compilers.DUMMY.id,
            "context": context,
            "target_asm": "glabel meow\njr $ra",
            "name": "cat scratch",
        }
        return scratch_dict

    def test_context_deduplicates_identical_texts(self) -> None:
        ctx = "typedef int s32;"
        d = self.create_scratch_with_context(ctx)
        s1 = self.create_scratch(d)
        s2 = self.create_scratch(d)

        self.assertIsNotNone(s1.context_fk)
        self.assertEqual(s1.context_fk_id, s2.context_fk_id)
        self.assertEqual(Context.objects.count(), 1)
        ctx_obj = Context.objects.first()
        assert ctx_obj is not None
        self.assertEqual(ctx_obj.text, ctx)

    def test_context_creates_separate_instances_for_different_texts(self) -> None:
        d1 = self.create_scratch_with_context("typedef int s32;")
        d2 = self.create_scratch_with_context("typedef float f32;")
        s1 = self.create_scratch(d1)
        s2 = self.create_scratch(d2)

        self.assertNotEqual(s1.context_fk_id, s2.context_fk_id)
        self.assertEqual(Context.objects.count(), 2)

    def test_context_blank_does_not_create_instance(self) -> None:
        d = self.create_scratch_with_context("")
        s = self.create_scratch(d)
        self.assertIsNone(s.context_fk)
        self.assertEqual(Context.objects.count(), 0)

    def test_context_update_creates_or_links_new_instance(self) -> None:
        d = self.create_scratch_with_context("typedef int s32;")
        s = self.create_scratch(d)
        old_ctx_id = s.context_fk_id
        slug = s.slug

        # Obtain ownership of the scratch
        response = self.client.post(
            reverse("scratch-claim", kwargs={"pk": slug}),
            {"token": s.claim_token},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["success"])

        # Patch the scratch with a new context
        response = self.client.patch(
            reverse("scratch-detail", kwargs={"pk": s.slug}),
            {"context": "typedef float f32;"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Ensure a new context was created
        s.refresh_from_db()
        self.assertNotEqual(s.context_fk_id, old_ctx_id)
        self.assertIsNotNone(s.context_fk)
        assert s.context_fk is not None
        self.assertEqual(s.context_fk.text, "typedef float f32;")
        self.assertEqual(Context.objects.count(), 2)

    def test_context_protects_from_deletion_while_in_use(self) -> None:
        d = self.create_scratch_with_context("typedef int s32;")
        s = self.create_scratch(d)
        ctx = s.context_fk
        self.assertIsNotNone(ctx)
        assert ctx is not None

        with self.assertRaises(ProtectedError):
            ctx.delete()

        # Deleting the scratch should free the context
        s.delete()
        # Now deletion should succeed
        ctx.delete()
        self.assertEqual(Context.objects.count(), 0)

    def test_context_can_be_deleted_after_all_scratches_removed(self) -> None:
        d = self.create_scratch_with_context("typedef int s32;")
        s1 = self.create_scratch(d)
        s2 = self.create_scratch(d)
        ctx = s1.context_fk
        self.assertIsNotNone(ctx)
        assert ctx is not None

        s1.delete()
        s2.delete()

        # Should now be orphaned
        self.assertTrue(
            Context.objects.filter(pk=ctx.pk, scratch__isnull=True).exists()
        )

        # Maintenance vacuum simulation
        Context.objects.filter(scratch__isnull=True).delete()
        self.assertFalse(Context.objects.exists())


class ScratchModificationTests(BaseTestCase):
    @requiresCompiler(GCC281PM, IDO53)
    def test_update_scratch_score(self) -> None:
        """
        Ensure that a scratch's score gets updated when the code changes.
        """
        scratch_dict = {
            "platform": N64.id,
            "compiler": GCC281PM.id,
            "context": "",
            "target_asm": "jr $ra",
        }
        scratch = self.create_scratch(scratch_dict)
        slug = scratch.slug

        self.assertGreater(scratch.score, 0)

        # Obtain ownership of the scratch
        response = self.client.post(
            reverse("scratch-claim", kwargs={"pk": slug}),
            {"token": scratch.claim_token},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["success"])

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

    @requiresCompiler(GCC281PM)
    def test_update_scratch_score_on_compile_get(self) -> None:
        """
        Ensure that a scratch's score gets updated on a GET to compile
        """
        scratch_dict = {
            "platform": N64.id,
            "compiler": GCC281PM.id,
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
        scratch_dict: Dict[str, Any] = {
            "compiler": platforms.DUMMY.id,
            "platform": compilers.DUMMY.id,
            "context": "",
            "target_asm": "glabel meow\njr $ra",
            "diff_label": "meow",
            "name": "cat scratch",
            "libraries": [{"name": "directx", "version": "8.0"}],
        }
        scratch = self.create_scratch(scratch_dict)

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
            "compiler": compilers.DUMMY.id,
            "platform": platforms.DUMMY.id,
            "context": "",
            "target_asm": "jr $ra\nnop\n",
        }
        scratch2_dict = {
            "compiler": compilers.DUMMY.id,
            "platform": platforms.DUMMY.id,
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
            "compiler": compilers.DUMMY.id,
            "platform": platforms.DUMMY.id,
            "context": "",
            "target_asm": " ",
        }
        scratch2_dict = {
            "compiler": compilers.DUMMY.id,
            "platform": platforms.DUMMY.id,
            "context": "",
            "target_asm": " ",
        }

        scratch1 = self.create_scratch(scratch1_dict)
        self.create_scratch(scratch2_dict)

        response = self.client.get(reverse("scratch-family", args=[scratch1.slug]))
        self.assertEqual(len(response.json()), 1)


class ScratchExportTests(BaseTestCase):
    @requiresCompiler(IDO71)
    def test_export_asm_scratch(self) -> None:
        """
        Ensure that a scratch can be exported as a zip
        """
        scratch_dict = {
            "platform": N64.id,
            "compiler": IDO71.id,
            "context": "typedef signed int s32;",
            "target_asm": "jr $ra\nli $v0,2",
            "source_code": "s32 func() { return 2; }",
        }
        scratch = self.create_scratch(scratch_dict)
        response = self.client.get(f"/api/scratch/{scratch.slug}/export")

        zip_file = zipfile.ZipFile(io.BytesIO(response.content))
        file_names = zip_file.namelist()

        self.assertIn("metadata.json", file_names)
        self.assertIn("target.s", file_names)
        self.assertIn("target.o", file_names)
        self.assertIn("code.c", file_names)
        self.assertIn("ctx.c", file_names)
        self.assertIn("current.o", file_names)

    @requiresCompiler(IDO71)
    def test_export_asm_scratch_target_only(self) -> None:
        """
        Ensure that a scratch can be exported as a zip
        without performing the actual compilation step
        """
        scratch_dict = {
            "platform": N64.id,
            "compiler": IDO71.id,
            "context": "typedef signed int s32;",
            "target_asm": "jr $ra\nli $v0,2",
            "source_code": "s32 func() { return 2; }",
        }
        scratch = self.create_scratch(scratch_dict)
        response = self.client.get(f"/api/scratch/{scratch.slug}/export?target_only=1")

        zip_file = zipfile.ZipFile(io.BytesIO(response.content))
        file_names = zip_file.namelist()

        self.assertIn("metadata.json", file_names)
        self.assertIn("target.s", file_names)
        self.assertIn("target.o", file_names)
        self.assertIn("code.c", file_names)
        self.assertIn("ctx.c", file_names)
        self.assertNotIn("current.o", file_names)
