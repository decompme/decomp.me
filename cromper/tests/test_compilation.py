"""
Test compilation functionality in cromper.
"""

import unittest

from cromper.cromper.wrappers.compiler_wrapper import CompilationResult
from cromper.compilers import (
    GCC281PM,
    IDO53,
    MWCC_247_92,
    PBX_GCC3,
    WATCOM_105_C,
)
from cromper import platforms
from cromper.cromper.wrappers.diff_wrapper import DiffWrapper
from cromper.flags import Language

from .common import CromperTestCase, requiresCompiler, compilers


def _make_compiler_test(compiler):
    """Create a test method for a specific compiler."""

    def _test_method(self):
        """Test that this specific compiler can compile basic code."""
        if not compilers.is_compiler_available(compiler):
            self.fail(f"Compiler {compiler.id} not available")

        wrapper = self.create_compiler_wrapper()

        code = "int func(void) { return 5; }"
        if compiler.language == Language.PASCAL:
            code = "function func(): integer; begin func := 5; end;"
        elif compiler.language == Language.ASSEMBLY:
            code = "nada"

        result = wrapper.compile_code(
            compiler=compiler,
            compiler_flags="",
            code=code,
            context="",
            libraries=[],
        )

        self.assertIsValidElfObject(
            result.elf_object,
            f"Compilation with {compiler.id} should produce valid ELF",
        )

    # Set a descriptive name and docstring for the test method
    _test_method.__name__ = (
        f"test_compiler_{compiler.id.replace('-', '_').replace('.', '_')}"
    )
    _test_method.__doc__ = f"Test compilation with {compiler.id}"
    return _test_method


class CompilationTests(CromperTestCase):
    """Test compilation functionality."""

    @requiresCompiler(GCC281PM)
    def test_gcc281pm_simple_compilation(self) -> None:
        """Test simple compilation with GCC 2.8.1pm."""
        wrapper = self.create_compiler_wrapper()
        result = wrapper.compile_code(
            compiler=GCC281PM,
            compiler_flags="-mips2 -O2",
            code="int add(int a, int b) { return a + b; }",
            context="",
            libraries=[],
        )

        self.assertIsInstance(result, CompilationResult)
        self.assertIsValidElfObject(result.elf_object)

    @requiresCompiler(GCC281PM)
    def test_giant_compilation(self) -> None:
        """Ensure that we can compile a giant file with lots of context."""
        wrapper = self.create_compiler_wrapper()

        # Generate large context
        context = ""
        for i in range(25000):  # Reduced from 25000 for faster testing
            context += "extern int test_symbol_to_be_used_in_a_test;\n"

        result = wrapper.compile_code(
            compiler=GCC281PM,
            compiler_flags="-mips2 -O2",
            code="int add(int a, int b) { return a + b; }",
            context=context,
            libraries=[],
        )

        self.assertIsInstance(result, CompilationResult)
        self.assertIsValidElfObject(result.elf_object)

    @requiresCompiler(IDO53)
    def test_ido_line_endings(self) -> None:
        """Ensure that compilations with \r\n line endings succeed."""
        wrapper = self.create_compiler_wrapper()
        result = wrapper.compile_code(
            compiler=IDO53,
            compiler_flags="-mips2 -O2",
            code="int dog = 5;",
            context="extern char libvar1;\r\nextern char libvar2;\r\n",
            libraries=[],
        )

        self.assertIsValidElfObject(
            result.elf_object, "IDO compilation with \r\n line endings"
        )

    @requiresCompiler(IDO53)
    def test_ido_kpic(self) -> None:
        """Ensure that IDO compilations including -KPIC produce different code."""
        wrapper = self.create_compiler_wrapper()

        result_non_shared = wrapper.compile_code(
            compiler=IDO53,
            compiler_flags="-mips2 -O2",
            code="int dog = 5;",
            context="",
            libraries=[],
        )

        result_kpic = wrapper.compile_code(
            compiler=IDO53,
            compiler_flags="-mips2 -O2 -KPIC",
            code="int dog = 5;",
            context="",
            libraries=[],
        )

        self.assertNotEqual(
            result_non_shared.elf_object,
            result_kpic.elf_object,
            "The compilation result should be different with -KPIC",
        )

    @requiresCompiler(PBX_GCC3)
    def test_pbx_gcc3(self) -> None:
        """Ensure that we can invoke the PowerPC GCC3 cross-compiler."""
        wrapper = self.create_compiler_wrapper()
        result = wrapper.compile_code(
            compiler=PBX_GCC3,
            compiler_flags="-std=c99 -fPIC -O0 -g3",
            code="int func(void) { float f = 5.0; return f; }",  # test if floats are handled correctly
            context="extern char libvar1;\r\nextern char libvar2;\r\n",
            libraries=[],
        )

        self.assertIsValidElfObject(result.elf_object, "PowerPC GCC3 compilation")

    @requiresCompiler(MWCC_247_92)
    def test_mwcc(self) -> None:
        """Ensure that we can invoke mwcc."""
        wrapper = self.create_compiler_wrapper()
        result = wrapper.compile_code(
            compiler=MWCC_247_92,
            compiler_flags="-str reuse -inline on -fp off -O0",
            code="int func(void) { return 5; }",
            context="extern char libvar1;\r\nextern char libvar2;\r\n",
            libraries=[],
        )

        self.assertIsValidElfObject(result.elf_object, "MWCC compilation")

    @requiresCompiler(WATCOM_105_C)
    def test_watcom_cc(self) -> None:
        """Ensure that we can invoke watcom cc."""
        wrapper = self.create_compiler_wrapper()
        result = wrapper.compile_code(
            compiler=WATCOM_105_C,
            compiler_flags="",
            code="int func(void) { return 5; }",
            context="extern char libvar1;\r\nextern char libvar2;\r\n",
            libraries=[],
        )

        self.assertIsValidElfObject(result.elf_object, "Watcom compilation")

    def test_compilation_with_diff(self) -> None:
        """Test compilation combined with diff generation."""
        wrapper = self.create_compiler_wrapper()
        diff_wrapper = DiffWrapper()

        compiler = GCC281PM
        platform = platforms.N64  # TODO test all available platforms

        code = "int func(void) { return 5; }"
        if compiler.language == Language.PASCAL:
            code = "function func(): integer; begin func := 5; end;"
        elif compiler.language == Language.ASSEMBLY:
            code = "nada"

        result = wrapper.compile_code(
            compiler=compiler,
            compiler_flags="",
            code=code,
            context="",
            libraries=[],
        )

        diff_result = diff_wrapper.diff(
            target_elf=result.elf_object,
            platform=platform,
            diff_label="func",
            compiled_elf=result.elf_object,
            diff_flags=[],
        )

        self.assertIsNotNone(diff_result.result, "Diff result should not be None")
        if diff_result.result:
            self.assertIn("rows", diff_result.result, "Diff result should contain rows")
            self.assertGreater(
                len(diff_result.result["rows"]), 0, "Diff should have rows"
            )


class CompilerFilteringTests(CromperTestCase):
    """Test compiler flag filtering functionality."""

    def test_filter_compiler_flags(self) -> None:
        """Test that compiler flag filtering works correctly."""
        from cromper.cromper.wrappers.compiler_wrapper import CompilerWrapper

        test_cases = [
            # (input_flags, expected_output)
            ("-O2 -g", "-O2 -g"),  # Basic flags should pass through
            ("-O2 -B/path -g", "-O2 -g"),  # -B flag should be removed
            ("-I/include -O2", "-O2"),  # -I flag should be removed
            ("-ffreestanding -O2", "-O2"),  # -ffreestanding should be removed
            ("-O2 -non_shared -g", "-O2 -g"),  # -non_shared should be removed
            ("-Xcpluscomm -O2", "-O2"),  # -Xcpluscomm should be removed
            ("-Wab,-r4300_mul -O2", "-O2"),  # -Wab,-r4300_mul should be removed
            ("-c -O2", "-O2"),  # -c should be removed
            ("-B/path/to/dir -I/inc -U MACRO -O2", "-O2"),  # Multiple filtered flags
        ]

        for input_flags, expected in test_cases:
            with self.subTest(input_flags=input_flags):
                result = CompilerWrapper.filter_compiler_flags(input_flags)
                self.assertEqual(result, expected)


# Dynamically add individual compiler tests to the CompilationTests class
for compiler in compilers.all_compilers():
    compiler_test_method = _make_compiler_test(compiler)
    setattr(CompilationTests, compiler_test_method.__name__, compiler_test_method)


if __name__ == "__main__":
    unittest.main()
