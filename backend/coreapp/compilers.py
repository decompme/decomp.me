import copy
import logging
import platform as platform_stdlib
from dataclasses import dataclass
from typing import ClassVar, List

from coreapp import platforms
from coreapp.flags import (
    Flags,
    Flag,
    Language,
)
from coreapp.platforms import (
    Platform,
    from_id as platform_from_id,
)
from django.conf import settings

logger = logging.getLogger(__name__)


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
        compiler_dict = copy.deepcopy(compiler_dict)

        compiler_dict["platform"] = platform_from_id(compiler_dict["platform"])
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


DUMMY = DummyCompiler(id="dummy", platform=platforms.DUMMY)

DUMMY_LONGRUNNING = DummyLongRunningCompiler(
    id="dummy_longrunning", platform=platforms.DUMMY
)
