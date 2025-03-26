import logging
from dataclasses import dataclass
from functools import cache
from typing import List, OrderedDict, Dict

from coreapp.flags import (
    CompilerType,
    Checkbox,
    FlagSet,
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
    flags=[
        FlagSet(
            id="m2c_comment_style",
            flags=[
                "--comment-style=multiline",
                "--comment-style=oneline",
                "--comment-style=none",
            ],
        ),
                Checkbox(
            id="m2c_allman",
            flag="--allman",
        ),
        Checkbox(
            id="m2c_knr",
            flag="--knr",
        ),
        FlagSet(
            id="m2c_comment_alignment",
            flags=[
                "--comment-column=0",
                "--comment-column=52",
            ],
        ),
        Checkbox(
            id="m2c_indent_switch_contents",
            flag="--indent-switch-contents",
        ),
        Checkbox(
            id="m2c_leftptr",
            flag="--pointer-style left",
        ),
        Checkbox(
            id="m2c_zfill_constants",
            flag="--zfill-constants",
        ),
        Checkbox(
            id="m2c_unk_underscore",
            flag="--unk-underscore",
        ),
        Checkbox(
            id="m2c_hex_case",
            flag="--hex-case",
        ),
        Checkbox(
            id="m2c_force_decimal",
            flag="--force-decimal",
        ),
        FlagSet(
            id="m2c_global_decl",
            flags=[
                "--globals used",
                "--globals all",
                "--globals none",
            ],
        ),
        Checkbox(
            id="m2c_sanitize_tracebacks",
            flag="--sanitize-tracebacks",
        ),
        Checkbox(
            id="m2c_valid_syntax",
            flag="--valid-syntax",
        ),
        FlagSet(
            id="m2c_reg_vars",
            flags=[
                "--reg-vars saved",
                "--reg-vars most",
                "--reg-vars all",
                "--reg-vars r29,r30,r31",
            ],
        ),
        Checkbox(
            id="m2c_void",
            flag="--void",
        ),
        Checkbox(
            id="m2c_debug",
            flag="--debug",
        ),
        Checkbox(
            id="m2c_no_andor",
            flag="--no-andor",
        ),
        Checkbox(
            id="m2c_no_casts",
            flag="--no-casts",
        ),
        Checkbox(
            id="m2c_no_ifs",
            flag="--no-ifs",
        ),
        Checkbox(
            id="m2c_no_switches",
            flag="--no-switches",
        ),
        Checkbox(
            id="m2c_no_unk_inference",
            flag="--no-unk-inference",
        ),
        Checkbox(
            id="m2c_heuristic_strings",
            flag="--heuristic-strings",
        ),
        Checkbox(
            id="m2c_stack_structs",
            flag="--stack-structs",
        ),
        Checkbox(
            id="m2c_deterministic_vars",
            flag="--deterministic-vars",
        ),
    ],
)

_all_decompilers: List[Decompiler] = [M2C]

_decompilers = OrderedDict({d.id: d for d in _all_decompilers if d.available()})

logger.info(
    f"Enabled {len(_decompilers)} decompiler(s): {', '.join(_decompilers.keys())}"
)
