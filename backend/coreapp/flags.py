import copy
import enum
from dataclasses import dataclass
from typing import Dict, List, Union

ASMDIFF_FLAG_PREFIX = "-DIFF"


# NOTE: this is duplicated in backend & platforms
class Language(enum.Enum):
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
class Flag:
    id: str

    @staticmethod
    def from_dict(flag_dict):
        flag_dict = copy.deepcopy(flag_dict)
        flag_type = flag_dict.pop("type")

        if flag_type == "checkbox":
            return Checkbox(**flag_dict)
        elif flag_type == "flagset":
            return FlagSet(**flag_dict)
        elif flag_type == "language_flagset":
            return LanguageFlagSet(**flag_dict)
        else:
            raise Exception(f"Unknown flag type: {flag_type}!")


@dataclass(frozen=True)
class Checkbox(Flag):
    flag: str

    def to_json(self) -> Dict[str, str]:
        return {
            "type": "checkbox",
            "id": self.id,
            "flag": self.flag,
        }


@dataclass(frozen=True)
class FlagSet(Flag):
    flags: List[str]

    def to_json(self) -> Dict[str, Union[str, List[str]]]:
        return {
            "type": "flagset",
            "id": self.id,
            "flags": self.flags,
        }


@dataclass(frozen=True)
class LanguageFlagSet(Flag):
    flags: Dict[str, Language]

    def to_json(self) -> Dict[str, Union[str, List[str]]]:
        # To the client, we're a regular FlagSet - the extra metadata we carry
        # is purely for the backend to determine the scratch's language
        return {
            "type": "flagset",
            "id": self.id,
            "flags": list(self.flags.keys()),
        }


Flags = List[Union[Checkbox, FlagSet, LanguageFlagSet]]


COMMON_DIFF_FLAGS: Flags = [
    FlagSet(
        id="diff_algorithm",
        flags=[ASMDIFF_FLAG_PREFIX + "levenshtein", ASMDIFF_FLAG_PREFIX + "difflib"],
    ),
    Checkbox("diff_function_symbols", ASMDIFF_FLAG_PREFIX + "diff_function_symbols"),
]

COMMON_MIPS_DIFF_FLAGS: Flags = [
    FlagSet(
        id="mips_mreg_names",
        flags=[
            "",
            "-Mreg-names=32",
            "-Mreg-names=n32",
            "-Mreg-names=64",
            "-Mreg-names=numeric",
        ],
    ),
    Checkbox("mno_aliases", "-Mno-aliases"),
    Checkbox("no_show_rodata_refs", ASMDIFF_FLAG_PREFIX + "no_show_rodata_refs"),
]
