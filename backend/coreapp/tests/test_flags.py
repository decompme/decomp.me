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
            resolve_compiler_flags("gcc-gc"),
            COMMON_GCC_FLAGS + GCC_GC_FLAGS,
        )
        self.assertEqual(
            resolve_compiler_flags("mwcc-wii-gc"),
            COMMON_MWCC_FLAGS + MWCC_WII_GC_FLAGS,
        )

    def test_json_includes_required_ancestors_only(self) -> None:
        data = compiler_flag_classes_to_json({"gcc-gc"})

        self.assertEqual(set(data), {"gcc", "gcc-gc"})
        self.assertEqual(data["gcc-gc"]["parent"], "gcc")
        self.assertNotIn("parent", data["gcc"])
        self.assertEqual(
            len(cast(list[object], data["gcc"]["flags"])),
            len(COMPILER_FLAG_CLASSES["gcc"].flags),
        )

    def test_resolve_diff_flags_parent_first(self) -> None:
        self.assertEqual(
            resolve_diff_flags("mips"),
            COMMON_DIFF_FLAGS + COMMON_MIPS_DIFF_FLAGS,
        )

    def test_diff_json_includes_required_ancestors_only(self) -> None:
        data = diff_flag_classes_to_json({"mips"})

        self.assertEqual(set(data), {"common", "mips"})
        self.assertEqual(data["mips"]["parent"], "common")
        self.assertNotIn("parent", data["common"])
        self.assertEqual(
            len(cast(list[object], data["common"]["flags"])),
            len(DIFF_FLAG_CLASSES["common"].flags),
        )

    def test_unknown_flag_class_is_rejected(self) -> None:
        with self.assertRaisesRegex(ValueError, "Unknown compiler flag class"):
            resolve_compiler_flags("missing")
        with self.assertRaisesRegex(ValueError, "Unknown diff flag class"):
            resolve_diff_flags("missing")
