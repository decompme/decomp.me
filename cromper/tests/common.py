"""
Test utilities and common functionality for cromper tests.
"""

import os
import tempfile
import unittest
from collections.abc import Callable
from pathlib import Path
from typing import Any
from unittest import skip, skipIf

from cromper.compilers import Compiler, Compilers
from cromper.config import CromperConfig

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
        self.config = CromperConfig()

    def tearDown(self) -> None:
        # Clean up test directory
        import shutil

        if self.test_dir.exists():
            shutil.rmtree(self.test_dir)
        super().tearDown()

    def create_compiler_wrapper(self):
        """Create a CompilerWrapper with proper test configuration."""
        from cromper.wrappers.compiler_wrapper import CompilerWrapper

        return CompilerWrapper(self.config)

    def assertIsValidElfObject(self, elf_object: bytes, msg: str | None = None) -> None:
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
