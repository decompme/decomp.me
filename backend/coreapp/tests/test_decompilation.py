from coreapp.compilers import GCC281PM, IDO53, MWCC_247_92
from coreapp.decompiler_wrapper import DECOMP_WITH_CONTEXT_FAILED_PREAMBLE
from coreapp.m2c_wrapper import M2CWrapper
from coreapp.platforms import N64
from coreapp.tests.common import BaseTestCase, requiresCompiler
from django.test.testcases import TestCase
from django.urls import reverse


class DecompilationTests(BaseTestCase):
    @requiresCompiler(GCC281PM)
    def test_default_decompilation(self) -> None:
        """
        Ensure that a scratch's initial decompilation makes sense
        """
        scratch_dict = {
            "compiler": GCC281PM.id,
            "platform": N64.id,
            "context": "",
            "target_asm": "glabel return_2\njr $ra\nli $v0,2",
        }
        scratch = self.create_scratch(scratch_dict)
        self.assertEqual(
            scratch.source_code, "s32 return_2(void) {\n    return 2;\n}\n"
        )

    @requiresCompiler(GCC281PM)
    def test_decompile_endpoint(self) -> None:
        """
        Ensure that the decompile endpoint works
        """
        scratch_dict = {
            "compiler": GCC281PM.id,
            "platform": N64.id,
            "context": "typedef int s32;",
            "target_asm": "glabel return_2\njr $ra\nli $v0,2",
        }
        scratch = self.create_scratch(scratch_dict)

        response = self.client.post(
            reverse("scratch-decompile", kwargs={"pk": scratch.slug})
        )
        self.assertEqual(
            response.json()["decompilation"], "s32 return_2(void) {\n    return 2;\n}\n"
        )

        # Provide context and see that the decompilation changes
        response = self.client.post(
            reverse("scratch-decompile", kwargs={"pk": scratch.slug}),
            data={"context": "s32 return_2(void);"},
        )
        self.assertEqual(
            response.json()["decompilation"], "s32 return_2(void) {\n    return 2;\n}\n"
        )

    @requiresCompiler(GCC281PM)
    def test_decompile_endpoint_with_broken_context(self) -> None:
        """
        Ensure that the decompile endpoint works even if the context is broken
        """
        scratch_dict = {
            "compiler": GCC281PM.id,
            "platform": N64.id,
            "context": "typedeff jeff;",
            "target_asm": "glabel return_2\njr $ra\nli $v0,2",
        }
        scratch = self.create_scratch(scratch_dict)

        response = self.client.post(
            reverse("scratch-decompile", kwargs={"pk": scratch.slug}),
        )
        self.assertEqual(
            response.json()["decompilation"],
            "/*\nDecompilation failure:\n\nSyntax error when parsing C context.\nbefore: jeff at line 1, column 10\n\ntypedeff jeff;\n*/\n\n"
            + DECOMP_WITH_CONTEXT_FAILED_PREAMBLE
            + "\ns32 return_2(void) {\n    return 2;\n}\n",
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
            "n64",
            IDO53,
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
            "gc_wii",
            MWCC_247_92,
        )

        self.assertEqual(
            "s32 func_800B43A8(s32 arg0, s32 arg1) {\n    return (arg0 ^ arg0) - arg1;\n}\n",
            c_code,
        )
