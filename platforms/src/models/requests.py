import base64
import copy

from typing import Sequence
from dataclasses import dataclass

from .asm import Asm
from .compiler import Compiler
from .library import Library
from .platform import Platform


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
        compile_request["compiler"] = Compiler.from_dict(compile_request["compiler"])
        compile_request["libraries"] = [
            Library(**lib) for lib in compile_request["libraries"]
        ]

        return CompileRequest(**compile_request)


@dataclass(frozen=True)
class AssembleRequest:
    platform: Platform
    asm: Asm

    @staticmethod
    def from_dict(assemble_request_dict):
        assemble_request = copy.deepcopy(assemble_request_dict)
        assemble_request["platform"] = Platform.from_dict(assemble_request["platform"])
        assemble_request["asm"] = Asm.from_dict(assemble_request["asm"])

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
        objdump_request["platform"] = Platform.from_dict(objdump_request["platform"])
        objdump_request["target_data"] = base64.b64decode(
            objdump_request["target_data"].encode("utf")
        )

        return ObjdumpRequest(**objdump_request)
