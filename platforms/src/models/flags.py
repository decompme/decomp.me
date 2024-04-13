import enum
from dataclasses import dataclass
from typing import Dict, List, Union


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
        flag_type = flag_dict["type"]
        if flag_type == "checkbox":
            return Checkbox(**flag_dict)
        elif flag_type == "flagset":
            return FlagSet(**flag_dict)
        elif flag_type == "language_flagset":
            return LanguageFlagSet(**flag_dict)
        else:
            raise ValueError(f"Unknown Flag type received: {flag_type}")


@dataclass(frozen=True)
class Checkbox(Flag):
    flag: str
    type: str = "checkbox"

    def to_json(self) -> Dict[str, str]:
        return {
            "type": self.type,
            "id": self.id,
            "flag": self.flag,
        }


@dataclass(frozen=True)
class FlagSet(Flag):
    flags: List[str]
    type: str = "flagset"

    def to_json(self) -> Dict[str, Union[str, List[str]]]:
        return {
            "type": self.type,
            "id": self.id,
            "flags": self.flags,
        }


@dataclass(frozen=True)
class LanguageFlagSet(Flag):
    flags: Dict[str, Language]
    type: str = "language_flagset"

    def to_json(self) -> Dict[str, Union[str, List[str]]]:
        return {
            "type": self.type,
            "id": self.id,
            "flags": {f: l.value for (f, l) in self.flags.items()},
        }


Flags = List[Union[Checkbox, FlagSet, LanguageFlagSet]]
