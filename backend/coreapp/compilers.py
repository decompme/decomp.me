import copy
import platform as platform_stdlib
from dataclasses import dataclass
from typing import ClassVar, List

from django.conf import settings

from coreapp.platforms import Platform, DUMMY_PLATFORM
from coreapp.flags import (
    Flags,
    Flag,
    Language,
)


@dataclass(frozen=True)
class Compiler:
    id: str
    platform: Platform
    flags: List[Flags]
    language: Language = Language.C
    is_gcc: bool = False
    is_ido: bool = False
    is_mwcc: bool = False

    @staticmethod
    def from_dict(compiler_dict):
        # FIXME: circular dependency
        from .registry import registry

        compiler_dict = copy.deepcopy(compiler_dict)

        compiler_dict["platform"] = registry.get_platform_by_id(
            compiler_dict["platform"]
        )
        compiler_dict["flags"] = [
            Flag.from_dict(flag) for flag in compiler_dict["flags"]
        ]
        if "language" in compiler_dict:
            compiler_dict["language"] = Language(compiler_dict["language"])

        return Compiler(**compiler_dict)


@dataclass(frozen=True)
class DummyCompiler(Compiler):
    flags: ClassVar[Flags] = []

    def available(self) -> bool:
        return settings.DUMMY_COMPILER


@dataclass(frozen=True)
class DummyLongRunningCompiler(DummyCompiler):
    def available(self) -> bool:
        return settings.DUMMY_COMPILER and platform_stdlib.system() != "Windows"


DUMMY_COMPILER = DummyCompiler(id="dummy", platform=DUMMY_PLATFORM)

DUMMY_COMPILER_LONGRUNNING = DummyLongRunningCompiler(
    id="dummy_longrunning", platform=DUMMY_PLATFORM
)
