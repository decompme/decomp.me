import unittest

import diff as asm_differ

from cromper.wrappers.diff_wrapper import DiffWrapper


class CreateConfigTests(unittest.TestCase):
    def test_ignore_addr_diffs_enabled_for_aarch64(self) -> None:
        config = DiffWrapper.create_config(asm_differ.get_arch("aarch64"), [])
        self.assertTrue(config.ignore_addr_diffs)

    def test_ignore_addr_diffs_disabled_for_arm32(self) -> None:
        for arch_name in ("arm32", "armel"):
            config = DiffWrapper.create_config(asm_differ.get_arch(arch_name), [])
            self.assertFalse(
                config.ignore_addr_diffs,
                "asm-differ hides `bl` symbol name diffs on ARM32 when this is set",
            )

    def test_ignore_addr_diffs_disabled_for_arches_it_is_unimplemented_for(
        self,
    ) -> None:
        for arch_name in ("mips", "ppc", "x86"):
            config = DiffWrapper.create_config(asm_differ.get_arch(arch_name), [])
            self.assertFalse(config.ignore_addr_diffs)
