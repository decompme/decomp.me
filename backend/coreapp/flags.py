from dataclasses import dataclass
from typing import Dict, Union


@dataclass(frozen=True)
class Checkbox:
    id: str
    flag: str

    def to_json(self) -> Dict[str, str]:
        return {
            "type": "checkbox",
            "id": self.id,
            "flag": self.flag,
        }


@dataclass(frozen=True)
class FlagSet:
    id: str
    flags: list[str]

    def to_json(self) -> Dict[str, Union[str, list[str]]]:
        return {
            "type": "flagset",
            "id": self.id,
            "flags": self.flags,
        }


Flags = list[Union[Checkbox, FlagSet]]

COMMON_CLANG_FLAGS: Flags = [
    FlagSet(
        id="clang_opt_level", flags=["-O0", "-O1", "-O2", "-O3", "-Ofast", "-Os", "-Oz"]
    ),
    FlagSet(id="clang_debug_level", flags=["-g0", "-g1", "-g2", "-g3"]),
    FlagSet(id="clang_language", flags=["-x c++", "-x c"]),
    FlagSet(
        id="clang_language_standard",
        flags=[
            "-std=c++98",
            "-std=c++03",
            "-std=gnu++98",
            "-std=c++0x",
            "-std=c++11",
            "-std=gnu++0x",
            "-std=gnu++11",
            "-std=c++1y",
            "-std=c++14",
            "-std=gnu++1y",
            "-std=gnu++14",
            "-std=c++1z",
            "-std=gnu++1z",
        ],
    ),
    Checkbox(id="clang_no_rtti", flag="-fno-rtti"),
    Checkbox(id="clang_no_exceptions", flag="-fno-exceptions"),
]

COMMON_GCC_FLAGS: Flags = [
    FlagSet(id="gcc_opt_level", flags=["-O0", "-O1", "-O2", "-O3"]),
    FlagSet(id="gcc_debug_level", flags=["-g0", "-g1", "-g2", "-g3"]),
    FlagSet(id="gcc_char_type", flags=["-fsigned-char", "-funsigned-char"]),
    Checkbox("gcc_force_addr", "-fforce-addr"),
]

COMMON_IDO_FLAGS: Flags = [
    FlagSet(id="ido_opt_level", flags=["-O0", "-O1", "-O2", "-O3"]),
    FlagSet(id="ido_debug_level", flags=["-g0", "-g1", "-g2", "-g3"]),
    FlagSet(id="mips_version", flags=["-mips1", "-mips2", "-mips3"]),
    Checkbox("kpic", "-KPIC"),
]

COMMON_MWCC_FLAGS: Flags = [
    FlagSet(
        id="mwcc_opt_level",
        flags=[
            "-O0",
            "-O1",
            "-O1,p",
            "-O1,s",
            "-O2",
            "-O2,p",
            "-O2,s",
            "-O3",
            "-O3,p",
            "-O3,s",
            "-O4",
            "-O4,p",
            "-O4,s",
        ],
    ),
    FlagSet(
        id="mwcc_floating_point", flags=["-fp off", "-fp soft", "-fp hard", "-fp fmadd"]
    ),
    FlagSet(
        id="mwcc_inline_options",
        flags=[
            "-inline on",
            "-inline off",
            "-inline auto",
            "-inline noauto",
            "-inline all",
            "-inline deferred",
        ],
    ),
    FlagSet(
        id="mwcc_string_constant_options",
        flags=["-str reuse", "-str pool", "-str readonly", "-str reuse,pool,readonly"],
    ),
    FlagSet(
        id="mwcc_language",
        flags=["-lang=c", "-lang=c++", "-lang=c99", "-lang=ec++", "-lang=objc"],
    ),
    FlagSet(id="mwcc_char_signedness", flags=["-char signed", "-char unsigned"]),
    Checkbox(id="mwcc_cpp_exceptions_off", flag="-Cpp_exceptions off"),
    Checkbox(id="mwcc_enum_int", flag="-enum int"),
    Checkbox(id="mwcc_rostr", flag="-rostr"),
    Checkbox(id="mwcc_rtti_off", flag="-RTTI off"),
    Checkbox(id="mwcc_enc_sjis", flag="-enc SJIS"),
    Checkbox(id="mwcc_fp_contract_on", flag="-fp_contract on"),
    Checkbox(id="mwcc_nodefaults", flag="-nodefaults"),
    Checkbox(id="mwcc_use_lmw_stmw_on", flag="-use_lmw_stmw on"),
    Checkbox(id="mwcc_debug_on", flag="-g"),
]

COMMON_GCC_PS1_FLAGS: Flags = [
    FlagSet(id="psyq_opt_level", flags=["-O0", "-O1", "-O2", "-O3", "-Os"]),
    FlagSet(id="gcc_debug_level", flags=["-g0", "-g1", "-g2", "-g3"]),
    FlagSet(id="gcc_char_type", flags=["-fsigned-char", "-funsigned-char"]),
    FlagSet(id="sdata_limit", flags=["-G0", "-G4", "-G8"]),
    FlagSet(id="endianness", flags=["-mel", "-meb"]),
]
