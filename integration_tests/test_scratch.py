"""
Integration tests for scratch compilation and assembly.

These tests require cromper to be running.
"""

import io
import zipfile

import pytest
from coreapp.models.scratch import Scratch
from coreapp.views.scratch import compile_scratch_update_score
from django.test import override_settings
from django.urls import reverse
from rest_framework import status

from .conftest import IntegrationTestBase


@pytest.mark.integration
class TestScratchCreation(IntegrationTestBase):
    """Tests for scratch creation with real compilers."""

    def test_accept_late_rodata(self, api_client):
        """
        Ensure that .late_rodata (used in ASM_PROCESSOR) is accepted during scratch creation.
        """
        scratch_dict = {
            "platform": "n64",
            "compiler": "ido7.1",
            "context": "",
            "target_asm": """.late_rodata
glabel D_8092C224
.float 0.1

.text
glabel func_80929D04
jr $ra
nop""",
        }
        self.create_scratch(api_client, scratch_dict)

    def test_n64_func(self, api_client):
        """
        Ensure that functions with t6/t7 registers can be assembled.
        """
        scratch_dict = {
            "platform": "n64",
            "compiler": "ido5.3",
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
        self.create_scratch(api_client, scratch_dict)

    def test_fpr_reg_names(self, api_client):
        """
        Ensure that functions with O32 register names can be assembled.
        """
        scratch_dict = {
            "platform": "n64",
            "compiler": "ido7.1",
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
        self.create_scratch(api_client, scratch_dict)

    def test_max_score(self, api_client):
        """
        Ensure that max_score is available upon scratch creation even if the initial compilation fails
        """
        scratch_dict = {
            "platform": "n64",
            "compiler": "ido7.1",
            "context": "this aint cod",
            "target_asm": ".text\nglabel func_80929D04\njr $ra\nnop",
        }
        scratch = self.create_scratch(api_client, scratch_dict)
        assert scratch.max_score == 200

    def test_import_scratch(self, api_client):
        """
        Ensure that creating a scratch created via permuter import.py is successful
        """
        scratch_dict = {
            "name": "imported_function",
            "target_asm": ".text\nglabel imported_function\njr $ra\nnop",
            "context": "/* context */",
            "source_code": "void imported_function(void) {}",
            "compiler": "ido7.1",
            "compiler_flags": "-O2",
            "diff_label": "imported_function",
        }
        scratch = self.create_scratch(api_client, scratch_dict)
        assert scratch.name == "imported_function"

    def test_mwcc_242_81(self, api_client):
        """
        Ensure that MWCC works
        """
        scratch_dict = {
            "platform": "gc_wii",
            "compiler": "mwcc_242_81",
            "context": "",
            "target_asm": ".fn somefunc, local\nblr\n.endfn somefunc",
        }
        self.create_scratch(api_client, scratch_dict)

    def test_ps2_platform(self, api_client):
        """
        Ensure that we can create scratches with the ps2 platform and compiler
        """
        scratch_dict = {
            "platform": "ps2",
            "compiler": "ee-gcc2.9-991111",
            "context": "",
            "target_asm": "jr $ra\nnop",
        }
        self.create_scratch(api_client, scratch_dict)


@pytest.mark.integration
class TestScratchModification(IntegrationTestBase):
    """Tests for scratch modification with compilation."""

    def test_update_scratch_score(self, api_client):
        """
        Ensure that a scratch's score gets updated when the code changes.
        """
        scratch_dict = {
            "platform": "n64",
            "compiler": "gcc2.8.1pm",
            "context": "",
            "target_asm": "jr $ra",
        }
        scratch = self.create_scratch(api_client, scratch_dict)
        slug = scratch.slug

        assert scratch.score > 0

        # Obtain ownership of the scratch
        response = api_client.post(
            reverse("scratch-claim", kwargs={"pk": slug}),
            {"token": scratch.claim_token},
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["success"] is True

        # Update the scratch's code and compiler output
        scratch_patch = {
            "source_code": "int func() { return 2; }",
            "compiler": "ido5.3",
        }

        response = api_client.patch(reverse("scratch-detail", kwargs={"pk": slug}), scratch_patch)
        assert response.status_code == status.HTTP_200_OK

        scratch = Scratch.objects.get(slug=slug)
        assert scratch is not None
        assert scratch.score == 200

    def test_update_scratch_score_on_compile_get(self, api_client):
        """
        Ensure that a scratch's score gets updated on a GET to compile
        """
        scratch_dict = {
            "platform": "n64",
            "compiler": "gcc2.8.1pm",
            "compiler_flags": "-O2",
            "context": "",
            "target_asm": "jr $ra\nli $v0,2",
            "source_code": "int func() { return 2; }",
        }
        scratch = self.create_scratch(api_client, scratch_dict)

        scratch.score = -1
        scratch.max_score = -1
        scratch.save()

        assert scratch.score == -1
        slug = scratch.slug

        response = api_client.get(reverse("scratch-compile", kwargs={"pk": slug}))
        assert response.status_code == status.HTTP_200_OK

        scratch = Scratch.objects.get(slug=slug)
        assert scratch is not None
        assert scratch.score == 0

    def test_create_scratch_score(self, api_client):
        """
        Ensure that a scratch's score gets set upon creation.
        """
        scratch_dict = {
            "platform": "n64",
            "compiler": "ido7.1",
            "context": "",
            "target_asm": "jr $ra\nli $v0,2",
            "source_code": "int func() { return 2; }",
        }
        scratch = self.create_scratch(api_client, scratch_dict)
        assert scratch.score == 0

    def test_update_scratch_score_does_not_affect_last_updated(self, api_client):
        """
        Ensure that a scratch's last_updated field does not get updated when the max_score changes.
        """
        scratch_dict = {
            "platform": "n64",
            "compiler": "ido7.1",
            "context": "",
            "target_asm": "jr $ra\nli $v0,2",
            "source_code": "int func() { return 2; }",
        }
        scratch = self.create_scratch(api_client, scratch_dict)
        scratch.max_score = -1
        scratch.save()
        assert scratch.max_score == -1

        prev_last_updated = scratch.last_updated
        compile_scratch_update_score(scratch)
        assert scratch.max_score == 200
        assert prev_last_updated == scratch.last_updated


@pytest.mark.integration
class TestScratchExport(IntegrationTestBase):
    """Tests for scratch export with compilation."""

    def test_export_asm_scratch(self, api_client):
        """
        Ensure that a scratch can be exported as a zip
        """
        scratch_dict = {
            "platform": "n64",
            "compiler": "ido7.1",
            "context": "typedef signed int s32;",
            "target_asm": "jr $ra\nli $v0,2",
            "source_code": "s32 func() { return 2; }",
        }
        scratch = self.create_scratch(api_client, scratch_dict)
        response = api_client.get(f"/api/scratch/{scratch.slug}/export")

        zip_file = zipfile.ZipFile(io.BytesIO(response.content))
        file_names = zip_file.namelist()

        assert "metadata.json" in file_names
        assert "target.s" in file_names
        assert "target.o" in file_names
        assert "code.c" in file_names
        assert "ctx.c" in file_names
        assert "current.o" in file_names

    def test_export_asm_scratch_target_only(self, api_client):
        """
        Ensure that a scratch can be exported as a zip
        without performing the actual compilation step
        """
        scratch_dict = {
            "platform": "n64",
            "compiler": "ido7.1",
            "context": "typedef signed int s32;",
            "target_asm": "jr $ra\nli $v0,2",
            "source_code": "s32 func() { return 2; }",
        }
        scratch = self.create_scratch(api_client, scratch_dict)
        response = api_client.get(f"/api/scratch/{scratch.slug}/export?target_only=1")

        zip_file = zipfile.ZipFile(io.BytesIO(response.content))
        file_names = zip_file.namelist()

        assert "metadata.json" in file_names
        assert "target.s" in file_names
        assert "target.o" in file_names
        assert "code.c" in file_names
        assert "ctx.c" in file_names
        assert "current.o" not in file_names

