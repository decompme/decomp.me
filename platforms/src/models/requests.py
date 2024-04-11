import base64
import copy

from typing import Sequence
from dataclasses import dataclass

from .compiler import Compiler
from .library import Library
from .platform import Platform

from ..compilers import from_id as compiler_from_id
from ..platforms import from_id as platform_from_id


@dataclass(frozen=True)
class CompileRequest:
    compiler: Compiler
    compiler_flags: str
    code: str
    context: str
    function: str
    libraries: Sequence[Library]

    @staticmethod
    def from_dict(compile_request_dict):
        compile_request = copy.deepcopy(compile_request_dict)
        compile_request["compiler"] = compiler_from_id(compile_request["compiler"])
        compile_request["libraries"] = [
            Library(**lib) for lib in compile_request["libraries"]
        ]

        return CompileRequest(**compile_request)


@dataclass(frozen=True)
class AssembleRequest:
    platform: Platform
    asm: str

    @staticmethod
    def from_dict(assemble_request_dict):
        assemble_request = copy.deepcopy(assemble_request_dict)
        assemble_request["platform"] = platform_from_id(assemble_request["platform"])

        return AssembleRequest(**assemble_request)


@dataclass(frozen=True)
class ObjdumpRequest:
    target_data: bytes
    platform: Platform
    arch_flags: tuple[str, ...]
    label: str
    objdump_flags: tuple[str, ...]
    flags: tuple[str, ...]  # Optional?

    @staticmethod
    def from_dict(objdump_request_dict):
        objdump_request = copy.deepcopy(objdump_request_dict)
        objdump_request["platform"] = platform_from_id(objdump_request["platform"])
        objdump_request["target_data"] = base64.b64decode(
            objdump_request["target_data"].encode("utf")
        )

        return ObjdumpRequest(**objdump_request)
