"""
Compiler utilities for the Django backend.

This module contains utility functions for working with compilers
that don't require the full compilation infrastructure.
"""

from dataclasses import dataclass
from enum import Enum


@dataclass(frozen=True)
class Platform:
    id: str
    name: str
    description: str
    arch: str
    compilers: list[str]
    has_decompiler: bool = False


# TODO copied from cromper, should deduplicate
class Language(Enum):
    C = "C"
    OLD_CXX = "C++"
    CXX = "C++"
    PASCAL = "Pascal"
    ASSEMBLY = "Assembly"
    OBJECTIVE_C = "ObjectiveC"

    def get_file_extension(self) -> str:
        return {
            Language.C: "c",
            Language.CXX: "cpp",
            Language.OLD_CXX: "c++",
            Language.PASCAL: "p",
            Language.ASSEMBLY: "s",
            Language.OBJECTIVE_C: "m",
        }[self]


@dataclass(frozen=True)
class Compiler:
    id: str
    platform: Platform
    flags: str
    diff_flags: str
    language: Language = Language.C


def filter_compiler_flags(compiler_flags: str) -> str:
    """
    Filter out compiler flags that are not relevant for matching or display.

    This is used to clean up flags before storing them in the database
    or displaying them to users.
    """
    # Remove irrelevant flags that are part of the base compiler configs or
    # don't affect matching, but clutter the compiler settings field.
    skip_flags_with_args = {
        "-B",
        "-I",
        "-U",
    }
    skip_flags = {
        "-ffreestanding",
        "-non_shared",
        "-Xcpluscomm",
        "-Wab,-r4300_mul",
        "-c",
    }

    # Parse and filter flags
    filtered_flags = []
    skip_next = False

    for flag in compiler_flags.split():
        if skip_next:
            skip_next = False
            continue

        if flag in skip_flags:
            continue

        # Check if this flag takes an argument
        flag_matches_skip = False
        for skip_flag in skip_flags_with_args:
            if flag.startswith(skip_flag):
                if flag == skip_flag:
                    # Flag and argument are separate, skip next token
                    skip_next = True
                # Either way, skip this flag
                flag_matches_skip = True
                break

        if not flag_matches_skip:
            filtered_flags.append(flag)

    return " ".join(filtered_flags)
