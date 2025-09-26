"""
Compiler utilities for the Django backend.

This module contains utility functions for working with compilers
that don't require the full compilation infrastructure.
"""

from dataclasses import dataclass
from typing import Any, Optional


@dataclass
class CompilationResult:
    """Result of a compilation operation."""

    elf_object: bytes
    errors: str


@dataclass
class DiffResult:
    """Result of a diff operation."""

    result: Optional[dict[str, Any]]
    errors: str


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
