import enum
from dataclasses import dataclass
from typing import Dict, List, Union

ASMDIFF_FLAG_PREFIX = "-DIFF"


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
    flags: List[str]

    def to_json(self) -> Dict[str, Union[str, List[str]]]:
        return {
            "type": "flagset",
            "id": self.id,
            "flags": self.flags,
        }


@dataclass(frozen=True)
class LanguageFlagSet:
    id: str
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

COMMON_ARMCC_FLAGS: Flags = [
    FlagSet(
        id="armcc_opt_level", flags=["-O0", "-O1", "-O2", "-O3", "-Ospace", "-Otime"]
    ),
    LanguageFlagSet(
        id="armcc_language",
        flags={"--c90": Language.C, "--c99": Language.C, "--cpp": Language.CXX},
    ),
    FlagSet(id="armcc_instset", flags=["--arm", "--thumb"]),
    Checkbox(id="armcc_debug", flag="--debug"),
]

COMMON_CLANG_FLAGS: Flags = [
    FlagSet(
        id="clang_opt_level", flags=["-O0", "-O1", "-O2", "-O3", "-Ofast", "-Os", "-Oz"]
    ),
    FlagSet(id="clang_debug_level", flags=["-g0", "-g1", "-g2", "-g3"]),
    LanguageFlagSet(
        id="clang_language", flags={"-x c++": Language.CXX, "-x c": Language.C}
    ),
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
    FlagSet(
        id="gcc_debug_level", flags=["-gdwarf-2", "-gdwarf", "-g0", "-g1", "-g2", "-g3"]
    ),
    FlagSet(id="gcc_char_type", flags=["-fsigned-char", "-funsigned-char"]),
    Checkbox("gcc_force_addr", "-fforce-addr"),
]

COMMON_IDO_FLAGS: Flags = [
    FlagSet(id="ido_opt_level", flags=["-O0", "-O1", "-O2", "-O3"]),
    FlagSet(id="ido_debug_level", flags=["-g0", "-g1", "-g2", "-g3"]),
    FlagSet(id="mips_version", flags=["-mips1", "-mips2", "-mips3"]),
    Checkbox("kpic", "-KPIC"),
    Checkbox("pass", "-v"),
]

COMMON_DIFF_FLAGS: Flags = [
    FlagSet(
        id="diff_algorithm",
        flags=[ASMDIFF_FLAG_PREFIX + "levenshtein", ASMDIFF_FLAG_PREFIX + "difflib"],
    ),
]

COMMON_MIPS_DIFF_FLAGS: Flags = [
    Checkbox("mreg_names=32", "-Mreg-names=32"),
    Checkbox("mno_aliases", "-Mno-aliases"),
    Checkbox("no_show_rodata_refs", ASMDIFF_FLAG_PREFIX + "no_show_rodata_refs"),
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
    LanguageFlagSet(
        id="mwcc_language",
        flags={
            "-lang=c": Language.C,
            "-lang=c++": Language.CXX,
            "-lang=c99": Language.C,
            "-lang=ec++": Language.CXX,
            "-lang=objc": Language.OBJECTIVE_C,
        },
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
    Checkbox(id="mwcc_line_numbers_on", flag="-sym on"),
]

COMMON_GCC_PS1_FLAGS: Flags = [
    FlagSet(id="psyq_opt_level", flags=["-O0", "-O1", "-O2", "-O3", "-Os"]),
    FlagSet(id="gcc_debug_level", flags=["-g0", "-g1", "-g2", "-g3"]),
    FlagSet(id="gcc_char_type", flags=["-fsigned-char", "-funsigned-char"]),
    FlagSet(id="sdata_limit", flags=["-G0", "-G4", "-G8"]),
    FlagSet(id="endianness", flags=["-mel", "-meb"]),
]

COMMON_GCC_SATURN_FLAGS: Flags = [
    FlagSet(id="gcc_opt_level", flags=["-O0", "-O1", "-O2", "-O3"]),
    FlagSet(id="gcc_arch", flags=["-m2"]),
]

COMMON_WATCOM_FLAGS: Flags = [
    FlagSet(
        id="watcom_codegen",
        flags=[
            "-0",
            "-1",
            "-2",
            "-3r",
            "-3s",
            "-4r",
            "-4s",
            "-5r",
            "-5s",
            "-6r",
            "-6s",
        ],
    ),
    FlagSet(id="watcom_packing", flags=["-zp1", "-zp2", "-zp4", "-zp8"]),
    FlagSet(id="watcom_platform", flags=["-bt=nt", "-bt=dos"]),
    Checkbox("watcom_disable_opt", "-od"),
    Checkbox("watcom_favour_space", "-os"),
    Checkbox("watcom_favour_perf", "-ot"),
    Checkbox("watcom_stack_frames", "-of+"),
    Checkbox("watcom_instr_sched", "-or"),
    Checkbox("watcom_inline_lib", "-oi"),
    Checkbox("watcom_inline_fpu", "-om"),
    Checkbox("watcom_loop_opt", "-ol"),
    Checkbox("watcom_fpu_recip", "-on"),
    Checkbox("watcom_fpu_result", "-op"),
    Checkbox("watcom_nostackchk", "-s"),
    Checkbox("watcom_signedchar", "-j"),
    Checkbox("watcom_fpu", "-fpi87"),
]
