from .models.flags import (
    Flags,
    FlagSet,
    Language,
    LanguageFlagSet,
    Checkbox,
)

ASMDIFF_FLAG_PREFIX = "-DIFF"


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
    Checkbox(id="gcc_force_addr", flag="-fforce-addr"),
]

COMMON_IDO_FLAGS: Flags = [
    FlagSet(id="ido_opt_level", flags=["-O0", "-O1", "-O2", "-O3"]),
    FlagSet(id="ido_debug_level", flags=["-g0", "-g1", "-g2", "-g3"]),
    FlagSet(id="mips_version", flags=["-mips1", "-mips2", "-mips3"]),
    Checkbox(id="kpic", flag="-KPIC"),
    Checkbox(id="pass", flag="-v"),
]

COMMON_DIFF_FLAGS: Flags = [
    FlagSet(
        id="diff_algorithm",
        flags=[ASMDIFF_FLAG_PREFIX + "levenshtein", ASMDIFF_FLAG_PREFIX + "difflib"],
    ),
    Checkbox(
        id="diff_function_symbols", flag=ASMDIFF_FLAG_PREFIX + "diff_function_symbols"
    ),
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
    Checkbox(id="mno_aliases", flag="-Mno-aliases"),
    Checkbox(
        id="no_show_rodata_refs", flag=ASMDIFF_FLAG_PREFIX + "no_show_rodata_refs"
    ),
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
        id="mwcc_inline_options",
        flags=[
            "-inline on",
            "-inline off",
            "-inline auto",
            "-inline noauto",
            "-inline all",
            "-inline deferred",
            "-inline bottomup",
            "-inline nobottomup",
        ],
    ),
    FlagSet(
        id="mwcc_string_constant_options",
        flags=["-str reuse", "-str pool", "-str readonly", "-str reuse,pool,readonly"],
    ),
    LanguageFlagSet(
        id="mwcc_source_language",
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
    FlagSet(id="mwcc_enum_size", flags=["-enum int", "-enum min"]),
    Checkbox(id="mwcc_rtti_off", flag="-RTTI off"),
    Checkbox(id="mwcc_line_numbers_on", flag="-sym on"),
]

COMMON_MWCC_NDS_ARM9_FLAGS = COMMON_MWCC_FLAGS + [
    FlagSet(
        id="mwcc_floating_point",
        flags=[
            "-fp soft",
            "-fp vfpv1",
            "-fp vfpv2",
        ],
    ),
    Checkbox(id="mwcc_rostr", flag="-rostr"),
    Checkbox(id="mwcc_enc_sjis", flag="-enc SJIS"),
]

COMMON_MWCC_PS2_FLAGS = COMMON_MWCC_FLAGS + [
    FlagSet(id="mwcc_floating_point", flags=["-fp off", "-fp single"]),
]

COMMON_MWCC_PSP_FLAGS = COMMON_MWCC_FLAGS + [
    FlagSet(id="mwcc_floating_point", flags=["-fp off", "-fp single"]),
]

COMMON_MWCC_WII_GC_FLAGS = COMMON_MWCC_FLAGS + [
    FlagSet(
        id="mwcc_floating_point",
        flags=[
            "-fp off",
            "-fp soft",
            "-fp hard",
            "-fp fmadd",
            "-fp efpu",
            "-fp dpfp",
        ],
    ),
    Checkbox(id="mwcc_rostr", flag="-rostr"),
    Checkbox(id="mwcc_enc_sjis", flag="-enc SJIS"),
    Checkbox(id="mwcc_fp_contract_on", flag="-fp_contract on"),
    Checkbox(id="mwcc_use_lmw_stmw_on", flag="-use_lmw_stmw on"),
]

COMMON_GCC_PS1_FLAGS: Flags = [
    FlagSet(id="psyq_opt_level", flags=["-O0", "-O1", "-O2", "-O3", "-Os"]),
    FlagSet(id="gcc_debug_level", flags=["-g0", "-g1", "-g2", "-g3"]),
    FlagSet(id="gcc_char_type", flags=["-fsigned-char", "-funsigned-char"]),
    FlagSet(id="sdata_limit", flags=["-G0", "-G4", "-G8"]),
    FlagSet(id="endianness", flags=["-mel", "-meb"]),
]

COMMON_GCC_PS2_FLAGS: Flags = COMMON_GCC_FLAGS + [
    LanguageFlagSet(
        id="gcc_source_language",
        flags={
            "-x c": Language.C,
            "-x c++": Language.CXX,
        },
    ),
]

COMMON_GCC_SATURN_FLAGS: Flags = [
    FlagSet(id="gcc_opt_level", flags=["-O0", "-O1", "-O2", "-O3"]),
    FlagSet(id="gcc_arch", flags=["-m2"]),
]

COMMON_MSVC_FLAGS: Flags = [
    FlagSet(
        id="msvc_opt_level", flags=["/Od", "/O1", "/O2", "/Os", "/Ot", "/Og", "/Ox"]
    ),
    FlagSet(id="msvc_codegen", flags=["/GB", "/G3", "/G4", "/G5", "/G6"]),
    Checkbox(id="msvc_compile_cpp", flag="/TP"),
    Checkbox(id="msvc_use_rtti", flag="/GR"),
    Checkbox(id="msvc_use_ehsc", flag="/GX"),
    Checkbox(id="msvc_disable_stack_checking", flag="/Gs"),
    Checkbox(id="msvc_runtime_debug_checks", flag="/GZ"),
    Checkbox(id="msvc_cdecl", flag="/Gd"),
    Checkbox(id="msvc_fastcall", flag="/Gr"),
    Checkbox(id="msvc_stdcall", flag="/Gz"),
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
    Checkbox(id="watcom_disable_opt", flag="-od"),
    Checkbox(id="watcom_favour_space", flag="-os"),
    Checkbox(id="watcom_favour_perf", flag="-ot"),
    Checkbox(id="watcom_stack_frames", flag="-of+"),
    Checkbox(id="watcom_instr_sched", flag="-or"),
    Checkbox(id="watcom_inline_lib", flag="-oi"),
    Checkbox(id="watcom_inline_fpu", flag="-om"),
    Checkbox(id="watcom_loop_opt", flag="-ol"),
    Checkbox(id="watcom_fpu_recip", flag="-on"),
    Checkbox(id="watcom_fpu_result", flag="-op"),
    Checkbox(id="watcom_nostackchk", flag="-s"),
    Checkbox(id="watcom_signedchar", flag="-j"),
    Checkbox(id="watcom_fpu", flag="-fpi87"),
]
