import unittest

from cromper.compilers import GCC281PM, IDO53, MWCC_247_92
from cromper.compilers import Compiler
from cromper.platforms import GC_WII, N64, Platform
from cromper.wrappers.decompiler_wrapper import (
    DecompilerWrapper,
    DECOMP_WITH_CONTEXT_FAILED_PREAMBLE,
)
from cromper.wrappers.m2c_wrapper import M2CWrapper

from .common import CromperTestCase, requiresCompiler

MOCK_PLATFORM = Platform(
    id="mock",
    name="Mock Platform",
    description="",
    arch="mips",
    assemble_cmd="",
    objdump_cmd="",
    nm_cmd="",
)

MOCK_UNSUPPORTED_PLATFORM = Platform(
    id="mock",
    name="Mock Platform",
    description="",
    arch="unsupported_arch",
    assemble_cmd="",
    objdump_cmd="",
    nm_cmd="",
)


class DecompilationTests(CromperTestCase):
    """Test decompilation functionality."""

    @requiresCompiler(GCC281PM)
    def test_default_decompilation(self) -> None:
        """Test basic decompilation functionality."""
        wrapper = DecompilerWrapper()
        platform = N64

        # Simple MIPS assembly that should decompile to a return statement
        asm = "glabel return_2\njr $ra\nli $v0,2"

        result = wrapper.decompile(
            default_source_code="",
            platform=platform,
            asm=asm,
            context="",
            compiler=GCC281PM,
        )

        self.assertIsInstance(result, str)
        self.assertIn("return", result.lower())

    @requiresCompiler(GCC281PM)
    def test_decompilation_with_context(self) -> None:
        """Test decompilation with context code."""
        wrapper = DecompilerWrapper()
        platform = N64

        asm = "glabel return_2\njr $ra\nli $v0,2"
        context = "typedef int s32;"

        result = wrapper.decompile(
            default_source_code="",
            platform=platform,
            asm=asm,
            context=context,
            compiler=GCC281PM,
        )

        self.assertIsInstance(result, str)
        self.assertIn("return", result.lower())

    @requiresCompiler(GCC281PM)
    def test_decompilation_with_broken_context(self) -> None:
        """Test decompilation with broken context code."""
        wrapper = DecompilerWrapper()
        platform = N64

        asm = "glabel return_2\njr $ra\nli $v0,2"
        broken_context = "typedeff jeff;"  # Intentional syntax error

        result = wrapper.decompile(
            default_source_code="/* default source */",
            platform=platform,
            asm=asm,
            context=broken_context,
            compiler=GCC281PM,
        )

        self.assertIsInstance(result, str)
        # Should contain error information and fallback
        self.assertTrue(
            "error" in result.lower()
            or "syntax" in result.lower()
            or DECOMP_WITH_CONTEXT_FAILED_PREAMBLE in result
        )

    def test_unsupported_architecture(self) -> None:
        """Test decompilation with unsupported architecture."""
        wrapper = DecompilerWrapper()

        asm = "some assembly"
        default_source = "/* default source */"

        result = wrapper.decompile(
            default_source_code=default_source,
            platform=MOCK_UNSUPPORTED_PLATFORM,
            asm=asm,
            context="",
            compiler=GCC281PM,
        )

        self.assertIsInstance(result, str)
        self.assertIn("No decompiler yet implemented", result)
        self.assertIn("unsupported_arch", result)

    def test_too_many_lines(self) -> None:
        """Test decompilation with too many lines of assembly."""
        wrapper = DecompilerWrapper()
        platform = N64

        # Create assembly with too many lines
        asm_lines = ["nop"] * 20000  # Exceeds MAX_M2C_ASM_LINES
        asm = "\n".join(asm_lines)

        result = wrapper.decompile(
            default_source_code="/* default */",
            platform=platform,
            asm=asm,
            context="",
            compiler=GCC281PM,
        )

        self.assertIsInstance(result, str)
        self.assertIn("Too many lines to decompile", result)


class M2CTests(CromperTestCase):
    """Test M2C wrapper functionality."""

    def test_left_pointer_style(self) -> None:
        """Ensure that pointers are next to types (left style)."""
        wrapper = M2CWrapper()

        c_code = wrapper.decompile(
            asm="""
        glabel func
        li $t6,1
        jr $ra
        sw $t6,0($a0)
        """,
            context="",
            platform_id=N64.id,
            compiler=IDO53,
        )

        self.assertIsInstance(c_code, str)
        self.assertIn(
            "s32*",
            c_code,
            f"The decompiled c code should have a left-style pointer, was instead:\n{c_code}",
        )

    def test_ppc_decompilation(self) -> None:
        """Ensure that we can decompile PPC code."""
        wrapper = M2CWrapper()

        c_code = wrapper.decompile(
            asm="""
        .global func_800B43A8
        func_800B43A8:
        xor r0, r3, r3
        subf r3, r4, r0
        blr
        """,
            context="",
            platform_id=GC_WII.id,
            compiler=MWCC_247_92,
        )

        expected = "s32 func_800B43A8(s32 arg0, s32 arg1) {\n    return (arg0 ^ arg0) - arg1;\n}\n"
        self.assertEqual(expected, c_code)

    def test_get_triple(self) -> None:
        """Test M2C triple generation for different architectures and compilers."""
        test_cases = [
            (IDO53, "mips", "mips-ido"),
            (GCC281PM, "mips", "mips-gcc"),
            (MWCC_247_92, "ppc", "ppc-mwcc"),
            (GCC281PM, "mipsel", "mips-gcc"),
            (GCC281PM, "mipsee", "mips-gcc"),
        ]

        for compiler, arch, expected_triple in test_cases:
            with self.subTest(compiler=compiler.id, arch=arch):
                triple = M2CWrapper.get_triple(compiler.platform.id, compiler)
                self.assertEqual(triple, expected_triple)

    def test_unsupported_platform(self) -> None:
        """Test M2C with unsupported platform"""
        from cromper.error import M2CError

        compiler = Compiler(
            id="mock", cc="mock", platform=MOCK_PLATFORM, library_include_flag=""
        )

        with self.assertRaises(M2CError) as cm:
            M2CWrapper.get_triple("mips", compiler)

        self.assertIn("Unsupported platform", str(cm.exception))

    def test_unsupported_compiler(self) -> None:
        """Test M2C with unsupported compiler type."""
        from cromper.error import M2CError

        compiler = Compiler(id="mock", cc="mock", platform=N64, library_include_flag="")

        with self.assertRaises(M2CError) as cm:
            M2CWrapper.get_triple("mips", compiler)

        self.assertIn("Unsupported platform", str(cm.exception))


if __name__ == "__main__":
    unittest.main()
