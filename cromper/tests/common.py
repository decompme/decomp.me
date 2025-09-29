"""
Test utilities and common functionality for cromper tests.
"""

import os
import tempfile
import unittest
from pathlib import Path
from typing import Any, Callable, Optional
from unittest import skip, skipIf

from cromper.compilers import Compiler, Compilers

# Create global compilers instance for tests
compilers = Compilers(Path(os.getenv("COMPILER_BASE_PATH", "./compilers")))


def requiresCompiler(*compiler_list: Compiler) -> Callable[..., Any]:
    """Decorator to skip tests if required compilers are not available."""
    for c in compiler_list:
        if not compilers.is_compiler_available(c):
            return skip(f"Compiler {c.id} not available")
    return skipIf(False, "")


class CromperTestCase(unittest.TestCase):
    """Base test case for cromper tests with common utilities."""

    def setUp(self) -> None:
        super().setUp()
        # Set up test environment
        self.test_dir = Path(tempfile.mkdtemp())

    def tearDown(self) -> None:
        # Clean up test directory
        import shutil

        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
        super().tearDown()

    def create_compiler_wrapper(self):
        """Create a CompilerWrapper with proper test configuration."""
        from cromper.main import CromperConfig
        from cromper.cromper.wrappers.compiler_wrapper import CompilerWrapper

        config = CromperConfig()
        wrapper = CompilerWrapper(
            use_sandbox_jail=config.use_sandbox_jail,
            compilation_timeout_seconds=config.compilation_timeout_seconds,
            assembly_timeout_seconds=config.assembly_timeout_seconds,
            sandbox_tmp_path=config.sandbox_tmp_path,
            sandbox_chroot_path=config.sandbox_chroot_path,
            compiler_base_path=config.compiler_base_path,
            library_base_path=config.library_base_path,
            wineprefix=config.wineprefix,
            nsjail_bin_path=config.nsjail_bin_path,
            sandbox_disable_proc=config.sandbox_disable_proc,
            debug=config.debug,
        )
        return wrapper

    def assertIsValidElfObject(
        self, elf_object: bytes, msg: Optional[str] = None
    ) -> None:
        """Assert that the given bytes represent a valid ELF object."""
        if msg is None:
            msg = "ELF object should be valid"

        self.assertIsInstance(elf_object, bytes, f"{msg}: should be bytes")
        self.assertGreater(len(elf_object), 0, f"{msg}: should not be empty")


class AsyncCromperTestCase(CromperTestCase):
    """Base test case for async cromper tests using Tornado's AsyncTestCase."""

    def get_app(self):
        """Override in subclasses to return the Tornado application."""
        from cromper.main import CromperConfig, make_app

        config = CromperConfig()
        return make_app(config)
