import logging
from dataclasses import dataclass
from functools import cache
from typing import List, OrderedDict, Dict

from coreapp.flags import (
    CompilerType,
    Checkbox,
    Flags,
    Language,
)

from rest_framework import status
from rest_framework.exceptions import APIException

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DecompilerSpec:
    arch: str
    compiler_type: CompilerType
    language: Language

    def to_json(self) -> Dict[str, str]:
        return {
            "arch": self.arch,
            "compilerType": self.compiler_type.value,
            "language": self.language.value,
        }


@dataclass(frozen=True)
class Decompiler:
    id: str
    specs: List[DecompilerSpec]
    flags: Flags

    def available(self) -> bool:
        # TODO
        return True


def from_id(decompiler_id: str) -> Decompiler:
    if decompiler_id not in _decompilers:
        raise APIException(
            f"Unknown decompiler: {decompiler_id}",
            str(status.HTTP_400_BAD_REQUEST),
        )
    return _decompilers[decompiler_id]


@cache
def available_decompilers() -> List[Decompiler]:
    return list(_decompilers.values())


@cache
def available_specs() -> List[DecompilerSpec]:
    s_set = set(
        spec for decompiler in available_decompilers() for spec in decompiler.specs
    )

    # TODO
    return sorted(s_set, key=lambda s: str(s))


M2C = Decompiler(
    id="m2c",
    specs=[
        DecompilerSpec("mips", CompilerType.GCC, Language.C),
        DecompilerSpec("mips", CompilerType.GCC, Language.CXX),
        DecompilerSpec("mips", CompilerType.IDO, Language.C),
        DecompilerSpec("mips", CompilerType.IDO, Language.CXX),
        DecompilerSpec("mipsee", CompilerType.GCC, Language.C),
        DecompilerSpec("mipsee", CompilerType.GCC, Language.CXX),
        DecompilerSpec("mipsee", CompilerType.IDO, Language.C),
        DecompilerSpec("mipsee", CompilerType.IDO, Language.CXX),
        DecompilerSpec("mipsel", CompilerType.GCC, Language.C),
        DecompilerSpec("mipsel", CompilerType.GCC, Language.CXX),
        DecompilerSpec("mipsel", CompilerType.IDO, Language.C),
        DecompilerSpec("mipsel", CompilerType.IDO, Language.CXX),
        DecompilerSpec("mipsel:4000", CompilerType.GCC, Language.C),
        DecompilerSpec("mipsel:4000", CompilerType.GCC, Language.CXX),
        DecompilerSpec("mipsel:4000", CompilerType.IDO, Language.C),
        DecompilerSpec("mipsel:4000", CompilerType.IDO, Language.CXX),
        DecompilerSpec("ppc", CompilerType.MWCC, Language.C),
        DecompilerSpec("mips", CompilerType.MWCC, Language.CXX),
    ],
    flags=[Checkbox(id="test", flag="--test")],
)

_all_decompilers: List[Decompiler] = [M2C]

_decompilers = OrderedDict({d.id: d for d in _all_decompilers if d.available()})

logger.info(
    f"Enabled {len(_decompilers)} decompiler(s): {', '.join(_decompilers.keys())}"
)
