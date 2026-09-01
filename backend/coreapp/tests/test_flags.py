import unittest
from typing import cast

from coreapp.flags import (
    COMMON_DIFF_FLAGS,
    COMMON_GCC_FLAGS,
    COMMON_MIPS_DIFF_FLAGS,
    COMMON_MWCC_FLAGS,
    GCC_GC_FLAGS,
    MWCC_WII_GC_FLAGS,
    compiler_flag_classes_to_json,
    diff_flag_classes_to_json,
    resolve_flags,
)


class CompilerFlagClassTests(unittest.TestCase):
    def test_resolve_compiler_flags_parent_first(self) -> None:
        self.assertEqual(
            resolve_flags(GCC_GC_FLAGS),
            COMMON_GCC_FLAGS.flags + GCC_GC_FLAGS.flags,
        )
        self.assertEqual(
            resolve_flags(MWCC_WII_GC_FLAGS),
            COMMON_MWCC_FLAGS.flags + MWCC_WII_GC_FLAGS.flags,
        )

    def test_json_includes_required_ancestors_only(self) -> None:
        data = compiler_flag_classes_to_json((GCC_GC_FLAGS,))

        self.assertEqual(set(data), {COMMON_GCC_FLAGS.name, GCC_GC_FLAGS.name})
        self.assertEqual(data[GCC_GC_FLAGS.name]["parent"], COMMON_GCC_FLAGS.name)
        self.assertNotIn("parent", data[COMMON_GCC_FLAGS.name])
        self.assertEqual(
            len(cast(list[object], data[COMMON_GCC_FLAGS.name]["flags"])),
            len(COMMON_GCC_FLAGS.flags),
        )

    def test_resolve_diff_flags_parent_first(self) -> None:
        self.assertEqual(
            resolve_flags(COMMON_MIPS_DIFF_FLAGS),
            COMMON_DIFF_FLAGS.flags + COMMON_MIPS_DIFF_FLAGS.flags,
        )

    def test_diff_json_includes_required_ancestors_only(self) -> None:
        data = diff_flag_classes_to_json((COMMON_MIPS_DIFF_FLAGS,))

        self.assertEqual(
            set(data), {COMMON_DIFF_FLAGS.name, COMMON_MIPS_DIFF_FLAGS.name}
        )
        self.assertEqual(
            data[COMMON_MIPS_DIFF_FLAGS.name]["parent"], COMMON_DIFF_FLAGS.name
        )
        self.assertNotIn("parent", data[COMMON_DIFF_FLAGS.name])
        self.assertEqual(
            len(cast(list[object], data[COMMON_DIFF_FLAGS.name]["flags"])),
            len(COMMON_DIFF_FLAGS.flags),
        )

    def test_parent_classes_are_object_references(self) -> None:
        self.assertIs(GCC_GC_FLAGS.parent, COMMON_GCC_FLAGS)
        self.assertIs(COMMON_MIPS_DIFF_FLAGS.parent, COMMON_DIFF_FLAGS)
