import unittest
from typing import cast

from coreapp.flags import (
    COMMON_DIFF_FLAGS,
    COMMON_GCC_FLAGS,
    COMMON_MIPS_DIFF_FLAGS,
    COMMON_MWCC_FLAGS,
    COMPILER_FLAG_CLASSES,
    DIFF_FLAG_CLASSES,
    GCC_GC_FLAGS,
    MWCC_WII_GC_FLAGS,
    compiler_flag_classes_to_json,
    diff_flag_classes_to_json,
    resolve_compiler_flags,
    resolve_diff_flags,
)


class CompilerFlagClassTests(unittest.TestCase):
    def test_resolve_compiler_flags_parent_first(self) -> None:
        self.assertEqual(
            resolve_compiler_flags(GCC_GC_FLAGS.name),
            COMMON_GCC_FLAGS.flags + GCC_GC_FLAGS.flags,
        )
        self.assertEqual(
            resolve_compiler_flags(MWCC_WII_GC_FLAGS.name),
            COMMON_MWCC_FLAGS.flags + MWCC_WII_GC_FLAGS.flags,
        )

    def test_json_includes_required_ancestors_only(self) -> None:
        data = compiler_flag_classes_to_json({GCC_GC_FLAGS.name})

        self.assertEqual(set(data), {COMMON_GCC_FLAGS.name, GCC_GC_FLAGS.name})
        self.assertEqual(data[GCC_GC_FLAGS.name]["parent"], COMMON_GCC_FLAGS.name)
        self.assertNotIn("parent", data[COMMON_GCC_FLAGS.name])
        self.assertEqual(
            len(cast(list[object], data[COMMON_GCC_FLAGS.name]["flags"])),
            len(COMPILER_FLAG_CLASSES[COMMON_GCC_FLAGS.name].flags),
        )

    def test_resolve_diff_flags_parent_first(self) -> None:
        self.assertEqual(
            resolve_diff_flags(COMMON_MIPS_DIFF_FLAGS.name),
            COMMON_DIFF_FLAGS.flags + COMMON_MIPS_DIFF_FLAGS.flags,
        )

    def test_diff_json_includes_required_ancestors_only(self) -> None:
        data = diff_flag_classes_to_json({COMMON_MIPS_DIFF_FLAGS.name})

        self.assertEqual(
            set(data), {COMMON_DIFF_FLAGS.name, COMMON_MIPS_DIFF_FLAGS.name}
        )
        self.assertEqual(
            data[COMMON_MIPS_DIFF_FLAGS.name]["parent"], COMMON_DIFF_FLAGS.name
        )
        self.assertNotIn("parent", data[COMMON_DIFF_FLAGS.name])
        self.assertEqual(
            len(cast(list[object], data[COMMON_DIFF_FLAGS.name]["flags"])),
            len(DIFF_FLAG_CLASSES[COMMON_DIFF_FLAGS.name].flags),
        )

    def test_unknown_flag_class_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "Unknown compiler flag class"):
            resolve_compiler_flags("missing")
        with self.assertRaisesRegex(ValueError, "Unknown diff flag class"):
            resolve_diff_flags("missing")
