from typing import Any, Callable
from coreapp import compilers
from coreapp.compiler_wrapper import CompilerWrapper
from coreapp.compilers import (
    GCC281PM,
    IDO53,
    IDO71,
    MWCC_247_92,
    PBX_GCC3,
    WATCOM_105_C,
    Compiler,
    DummyCompiler,
)
from coreapp.diff_wrapper import DiffWrapper
from coreapp.flags import Language
from coreapp.models.scratch import Assembly
from coreapp.tests.common import BaseTestCase, requiresCompiler
from django.urls import reverse
from parameterized import param, parameterized
from rest_framework import status


def all_compilers_name_func(
    testcase_func: Callable[[Any], None], param_num: int, param: param
) -> str:
    compiler: Compiler = param.args[0]
    return f"{testcase_func.__name__}_{parameterized.to_safe_name(compiler.platform.id + '_' + compiler.id)}"


class CompilationTests(BaseTestCase):
    @requiresCompiler(GCC281PM)
    def test_simple_compilation(self) -> None:
        """
        Ensure that we can run a simple compilation via the api
        """
        scratch_dict = {
            "compiler": GCC281PM.id,
            "platform": "n64",  # TODO use N64.id
            "context": "",
            "target_asm": "glabel func_80929D04\njr $ra\nnop",
        }

        # Test that we can create a scratch
        scratch = self.create_scratch(scratch_dict)

        compile_dict = {
            "slug": scratch.slug,
            "compiler": GCC281PM.id,
            "compiler_flags": "-mips2 -O2",
            "source_code": "int add(int a, int b){\nreturn a + b;\n}\n",
        }

        # Test that we can compile a scratch
        response = self.client.post(
            reverse("scratch-compile", kwargs={"pk": scratch.slug}), compile_dict
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @requiresCompiler(GCC281PM)
    def test_giant_compilation(self) -> None:
        """
        Ensure that we can compile a giant file
        """
        scratch_dict = {
            "compiler": GCC281PM.id,
            "platform": "n64",  # TODO use N64.id
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
            "compiler": GCC281PM.id,
            "compiler_flags": "-mips2 -O2",
            "source_code": "int add(int a, int b){\nreturn a + b;\n}\n",
            "context": context,
        }

        # Test that we can compile a scratch
        response = self.client.post(
            reverse("scratch-compile", kwargs={"pk": scratch.slug}), compile_dict
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertTrue(response.json()["success"])

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
            "platform": "n64",  # TODO use N64.id
            "compiler": IDO71.id,
            "diff_flags": ["-Mreg-names=32"],
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
        self.assertTrue(response.json()["success"])
        # Confirm the output contains the expected fpr reg names
        self.assertTrue("fv1f" in str(response.json()))

        response = self.client.post(
            reverse("scratch-compile", kwargs={"pk": scratch.slug}),
            {"diff_flags": "[]"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.json()["success"])
        # Confirm the output does not contain the expected fpr reg names
        self.assertFalse("fv1f" in str(response.json()))

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
    def test_mwcc(self) -> None:
        """
        Ensure that we can invoke mwcc
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

    @requiresCompiler(WATCOM_105_C)
    def test_watcom_cc(self) -> None:
        """
        Ensure that we can invoke watcom cc
        """
        result = CompilerWrapper.compile_code(
            WATCOM_105_C,
            "",
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

    @parameterized.expand(input=[(c,) for c in compilers.available_compilers() if not isinstance(c, DummyCompiler)], name_func=all_compilers_name_func, skip_on_empty=True)  # type: ignore
    def test_all_compilers(self, compiler: Compiler) -> None:
        """
        Ensure that we can run a simple compilation/diff for all available compilers
        """
        code = "int func(void) { return 5; }"
        if compiler.language == Language.PASCAL:
            code = "function func(): integer; begin func := 5; end;"

        if compiler.language == Language.ASSEMBLY:
            code = "nada"

        result = CompilerWrapper.compile_code(
            compiler,
            "",
            code,
            "",
            "func",
        )
        self.assertGreater(
            len(result.elf_object),
            0,
            "The compilation result should be non-null",
        )

        diff = DiffWrapper.diff(
            Assembly(elf_object=result.elf_object),
            compiler.platform,
            "",
            result.elf_object,
            diff_flags=[],
        )

        diff_result: dict[str, Any] = diff.result
        self.assertTrue(diff_result is not None and "rows" in diff_result)
        self.assertGreater(len(diff_result["rows"]), 0)
        self.assertEqual(None, diff.errors)
