from functools import lru_cache
from typing import Any, Dict, List, Optional, Set, Tuple
from collections import OrderedDict
from coreapp.error import AssemblyError, CompilationError
from coreapp.models import Asm, Assembly
from coreapp import util
from coreapp.sandbox import Sandbox
from django.conf import settings
import json
import logging
import os
from pathlib import Path
import subprocess
from dataclasses import dataclass
from platform import uname

logger = logging.getLogger(__name__)

DiffResult = Dict[str, Any]

CONFIG_JSON = "config.json"

PATH: str
if settings.USE_SANDBOX_JAIL:
    PATH = "/bin:/usr/bin"
else:
    PATH = os.environ["PATH"]

WINE: str
if "microsoft" in uname().release.lower() and not settings.USE_SANDBOX_JAIL:
    logger.info("WSL detected & nsjail disabled: wine not required.")
    WINE = ""
else:
    WINE = "wine"

def load_compiler(id: str, cc: Optional[str], platform: Optional[str], base_id: Optional[str]=None) -> Optional[Dict[str, str]]:
    if not cc or not platform:
        logger.error(f"Error: {id} {CONFIG_JSON} is missing 'cc' and/or 'platform' field(s), skipping.")
        return None

    if not base_id:
        base_id = id

    # allow binaries to exist outside of repo
    binaries_path = Path(CompilerWrapper.base_path() / base_id)
    # consider compiler binaries present if *any* non-config.json file is found
    binaries = (x for x in binaries_path.glob("*") if x.name != CONFIG_JSON)
    if next(binaries, None) != None:
        return {
            "cc": cc,
            "platform": platform,
            "basedir": base_id,
        }
    else:
        logger.debug(f"Config found but no binaries found for {id}, ignoring.")
        return None

def load_compilers() -> Dict[str, Dict[str, str]]:
    ret: Dict[str, Dict[str, str]] = {}
    compilers_base = settings.BASE_DIR / "compilers"
    compiler_dirs = next(os.walk(compilers_base))
    for compiler_dir_name in compiler_dirs[1]:
        config_path = Path(compilers_base / compiler_dir_name / CONFIG_JSON)
        if config_path.exists():
            with open(config_path) as f:
                try:
                    config = json.load(f)
                except:
                    logger.error(f"Error: Unable to parse {CONFIG_JSON} for {compiler_dir_name}")
                    continue

                if isinstance(config, dict):
                    comp = load_compiler(compiler_dir_name, config.get("cc"), config.get("platform"))
                    if comp:
                        ret[compiler_dir_name] = comp
                elif isinstance(config, list):
                    for list_def in config:
                        if "name" not in list_def:
                            logger.error(f"Error: {CONFIG_JSON} for {compiler_dir_name} is missing 'name' field")
                            continue
                        name = list_def["name"]
                        comp = load_compiler(name, list_def.get("cc"), list_def.get("platform"), compiler_dir_name)
                        if comp:
                            ret[name] = comp

    if settings.DUMMY_COMPILER:
        ret["dummy"] = {
            "platform": "dummy",
            "cc": "",
            "basedir": "",
        }
    return ret


@dataclass
class Platform:
    name: str
    description: str
    arch: str
    asm_prelude: str
    assemble_cmd: Optional[str] = None
    objdump_cmd: Optional[str] = None
    nm_cmd: Optional[str] = None
    supports_objdump_disassemble: bool = False

@dataclass
class CompilationResult:
    elf_object: bytes
    errors: str

def load_platforms() -> Dict[str, Platform]:
    return {
        "dummy": Platform(
            "Dummy System",
            "DMY",
            "dummy",
            assemble_cmd='echo \"assembled("$INPUT")\" > "$OUTPUT"',
            objdump_cmd="echo",
            nm_cmd="echo",
            asm_prelude="",
        ),
        "switch": Platform(
            "Nintendo Switch",
            "ARMv8-A",
            "aarch64",
            assemble_cmd='aarch64-linux-gnu-as -mcpu=cortex-a57+fp+simd+crypto+crc -o "$OUTPUT" "$INPUT"',
            objdump_cmd="aarch64-linux-gnu-objdump",
            nm_cmd="aarch64-linux-gnu-nm",
            asm_prelude="",
            supports_objdump_disassemble=True,
        ),
        "n64": Platform(
            "Nintendo 64",
            "MIPS (big-endian)",
            "mips",
            assemble_cmd='mips-linux-gnu-as -march=vr4300 -mabi=32 -o "$OUTPUT" "$INPUT"',
            objdump_cmd="mips-linux-gnu-objdump",
            nm_cmd="mips-linux-gnu-nm",
            asm_prelude="""
.macro .late_rodata
    .section .rodata
.endm

.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

.macro dlabel label
    .global \label
    \label:
.endm

.set noat
.set noreorder
.set gp=64

"""
        ),
        "ps1": Platform(
            "PlayStation",
            "MIPS (little-endian)",
            "mipsel",
            assemble_cmd='mips-linux-gnu-as -march=r3000 -mabi=32 -o "$OUTPUT" "$INPUT"',
            objdump_cmd="mips-linux-gnu-objdump",
            nm_cmd="mips-linux-gnu-nm",
            asm_prelude="""
.macro .late_rodata
    .section .rodata
.endm

.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

.set noat
.set noreorder

"""
        ),
        "ps2": Platform(
            "PlayStation 2",
            "MIPS (little-endian)",
            "mipsel",
            assemble_cmd='mips-linux-gnu-as -march=mips64 -mabi=64 -o "$OUTPUT" "$INPUT"',
            objdump_cmd="mips-linux-gnu-objdump",
            nm_cmd="mips-linux-gnu-nm",
            asm_prelude="""
.macro .late_rodata
    .section .rodata
.endm

.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

.set noat
.set noreorder

"""
        ),
        "gc_wii": Platform(
            "GameCube / Wii",
            "PowerPC",
            "ppc",
            assemble_cmd='powerpc-eabi-as -mgekko -o "$OUTPUT" "$INPUT"',
            objdump_cmd="powerpc-eabi-objdump",
            nm_cmd="powerpc-eabi-nm",
            asm_prelude="""
.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm

.set r0, 0
.set r1, 1
.set r2, 2
.set r3, 3
.set r4, 4
.set r5, 5
.set r6, 6
.set r7, 7
.set r8, 8
.set r9, 9
.set r10, 10
.set r11, 11
.set r12, 12
.set r13, 13
.set r14, 14
.set r15, 15
.set r16, 16
.set r17, 17
.set r18, 18
.set r19, 19
.set r20, 20
.set r21, 21
.set r22, 22
.set r23, 23
.set r24, 24
.set r25, 25
.set r26, 26
.set r27, 27
.set r28, 28
.set r29, 29
.set r30, 30
.set r31, 31
.set f0, 0
.set f1, 1
.set f2, 2
.set f3, 3
.set f4, 4
.set f5, 5
.set f6, 6
.set f7, 7
.set f8, 8
.set f9, 9
.set f10, 10
.set f11, 11
.set f12, 12
.set f13, 13
.set f14, 14
.set f15, 15
.set f16, 16
.set f17, 17
.set f18, 18
.set f19, 19
.set f20, 20
.set f21, 21
.set f22, 22
.set f23, 23
.set f24, 24
.set f25, 25
.set f26, 26
.set f27, 27
.set f28, 28
.set f29, 29
.set f30, 30
.set f31, 31
.set qr0, 0
.set qr1, 1
.set qr2, 2
.set qr3, 3
.set qr4, 4
.set qr5, 5
.set qr6, 6
.set qr7, 7
"""
        ),
        "nds_arm9": Platform(
            "Nintendo DS",
            "ARMv4T",
            "arm32",
            assemble_cmd='sed "$INPUT" -e "s/;/;@/" | arm-none-eabi-as -march=armv5te -mthumb -o "$OUTPUT"',
            objdump_cmd="arm-none-eabi-objdump",
            nm_cmd="arm-none-eabi-nm",
            asm_prelude="""
.macro glabel label
    .global \label
    .thumb
    \label:
.endm

.macro arm_func_start name
    .arm
    \name:
.endm
.macro arm_func_end name
.endm
.macro thumb_func_start name
    .thumb
    \name:
.endm
.macro non_word_aligned_thumb_func_start name
    .thumb
    \name:
.endm
.macro thumb_func_end name
.endm
"""
        ),
        "gba": Platform(
            "Game Boy Advance",
            "ARMv4T",
            "arm32",
            assemble_cmd='sed "$INPUT" -e "s/;/;@/" | arm-none-eabi-as -mcpu=arm7tdmi -mthumb -o "$OUTPUT"',
            objdump_cmd="arm-none-eabi-objdump",
            nm_cmd="arm-none-eabi-nm",
            asm_prelude="""
.macro glabel label
    .global \label
    .thumb
    \label:
.endm

.macro arm_func_start name
	.align 2, 0
	.arm
.endm
.macro arm_func_end name
.endm
.macro thumb_func_start name
	.align 2, 0
	.thumb
    .syntax unified
.endm
.macro non_word_aligned_thumb_func_start name
	.thumb
    .syntax unified
.endm
.macro thumb_func_end name
.endm
"""
        ),

    }

def get_assemble_cmd(platform: str) -> Optional[str]:
    if platform in _platforms:
        return _platforms[platform].assemble_cmd
    return None

def get_nm_command(platform: str) -> Optional[str]:
    if platform in _platforms:
        return _platforms[platform].nm_cmd
    return None

def get_objdump_command(platform: str) -> Optional[str]:
    if platform in _platforms:
        return _platforms[platform].objdump_cmd
    return None

def supports_objdump_disassemble(platform: str) -> bool:
    if platform in _platforms:
        return _platforms[platform].supports_objdump_disassemble
    return False

def _check_assembly_cache(*args: str) -> Tuple[Optional[Assembly], str]:
    hash = util.gen_hash(args)
    return Assembly.objects.filter(hash=hash).first(), hash


class CompilerWrapper:
    @staticmethod
    def base_path() -> Path:
        return settings.COMPILER_BASE_PATH

    @staticmethod
    def platform_from_compiler(compiler: str) -> Optional[str]:
        cfg = _compilers.get(compiler)
        return cfg.get("platform") if cfg else None

    @staticmethod
    def arch_from_platform(platform: str) -> Optional[str]:
        plt = _platforms.get(platform)
        return plt.arch if plt else None

    @staticmethod
    def available_compiler_ids() -> List[str]:
        return sorted(_compilers.keys())

    @staticmethod
    def available_compilers() -> Dict[str, Dict[str, Optional[str]]]:
        return {k: {"platform": CompilerWrapper.platform_from_compiler(k)} for k in CompilerWrapper.available_compiler_ids()}

    @staticmethod
    def available_platforms() -> OrderedDict[str, Dict[str, str]]:
        a_set: Set[str] = set()
        ret = OrderedDict()

        for id in CompilerWrapper.available_compiler_ids():
            a_set.add(_compilers[id]["platform"])

        for a in sorted(a_set):
            ret[a] = {
                "name": _platforms[a].name,
                "description": _platforms[a].description,
                "arch": _platforms[a].arch,
            }

        return ret

    @staticmethod
    def filter_compiler_flags(compiler: str, compiler_flags: str) -> str:
        cfg = _compilers[compiler]
        # Remove irrelevant flags that are part of the base compiler configs or
        # don't affect matching, but clutter the compiler settings field.
        # TODO: use cfg for this?
        skip_flags_with_args = {
            "-woff",
            "-B",
            "-I",
            "-D",
            "-U",
            "-G",
        }
        skip_flags = {
            "-ffreestanding",
            "-non_shared",
            "-Xcpluscomm",
            "-Xfullwarn",
            "-fullwarn",
            "-Wab,-r4300_mul",
            "-c",
            "-w",
        }

        skip_next = False
        flags = []
        for flag in compiler_flags.split():
            if skip_next:
                skip_next = False
                continue
            if flag in skip_flags:
                continue
            if flag in skip_flags_with_args:
                skip_next = True
                continue
            if any(flag.startswith(f) for f in skip_flags_with_args):
                continue
            flags.append(flag)
        return " ".join(flags)

    @staticmethod
    @lru_cache(maxsize=settings.COMPILATION_CACHE_SIZE) # type: ignore
    def compile_code(compiler: str, compiler_flags: str, code: str, context: str) -> CompilationResult:
        if compiler == "dummy":
            return CompilationResult(f"compiled({context}\n{code}".encode("UTF-8"), "")

        if compiler not in _compilers:
            raise CompilationError(f"Compiler {compiler} not found")

        code = code.replace("\r\n", "\n")
        context = context.replace("\r\n", "\n")

        with Sandbox() as sandbox:
            code_path = sandbox.path / "code.c"
            object_path = sandbox.path / "object.o"
            with code_path.open("w") as f:
                f.write('#line 1 "ctx.c"\n')
                f.write(context)
                f.write('\n')

                f.write('#line 1 "src.c"\n')
                f.write(code)
                f.write('\n')

            compiler_path = CompilerWrapper.base_path() / _compilers[compiler]["basedir"]

            cc_cmd = _compilers[compiler]["cc"]

            # IDO hack to support -KPIC
            if "ido" in compiler and "-KPIC" in compiler_flags:
                cc_cmd = cc_cmd.replace("-non_shared", "")

            # Run compiler
            try:
                compile_proc = sandbox.run_subprocess(
                    cc_cmd,
                    mounts=[compiler_path],
                    shell=True,
                    env={
                    "PATH": PATH,
                    "WINE": WINE,
                    "INPUT": sandbox.rewrite_path(code_path),
                    "OUTPUT": sandbox.rewrite_path(object_path),
                    "COMPILER_DIR": sandbox.rewrite_path(compiler_path),
                    "COMPILER_FLAGS": sandbox.quote_options(compiler_flags),
                    "MWCIncludes": "/tmp",
                })
            except subprocess.CalledProcessError as e:
                # Compilation failed
                logging.debug("Compilation failed: " + e.stderr)
                raise CompilationError(e.stderr)

            if not object_path.exists():
                raise CompilationError("Compiler did not create an object file")

            object_bytes = object_path.read_bytes()

            if not object_bytes:
                raise CompilationError("Compiler created an empty object file")

            return CompilationResult(object_path.read_bytes(), compile_proc.stderr)

    @staticmethod
    def assemble_asm(platform: str, asm: Asm) -> Assembly:
        if platform not in _platforms:
            raise AssemblyError(f"Platform {platform} not found")

        assemble_cmd = get_assemble_cmd(platform)
        if not assemble_cmd:
            raise AssemblyError(f"Assemble command for platform {platform} not found")

        cached_assembly, hash = _check_assembly_cache(platform, asm.hash)
        if cached_assembly:
            logger.debug(f"Assembly cache hit! hash: {hash}")
            return cached_assembly

        platform_cfg = _platforms[platform]

        if platform == "dummy":
            assembly = Assembly(
                hash=hash,
                arch=platform_cfg.arch,
                source_asm=asm,
                elf_object=f"assembled({asm.data})".encode("UTF-8")
            )
            assembly.save()
            return assembly

        with Sandbox() as sandbox:
            asm_path = sandbox.path / "asm.s"
            asm_path.write_text(platform_cfg.asm_prelude + asm.data)

            object_path = sandbox.path / "object.o"

            # Run assembler
            try:
                assemble_proc = sandbox.run_subprocess(
                    platform_cfg.assemble_cmd,
                    mounts=[],
                    shell=True,
                    env={
                    "PATH": PATH,
                    "INPUT": sandbox.rewrite_path(asm_path),
                    "OUTPUT": sandbox.rewrite_path(object_path),
                })
            except subprocess.CalledProcessError as e:
                raise AssemblyError.from_process_error(e)

            # Assembly failed
            if assemble_proc.returncode != 0:
                raise AssemblyError(f"Assembler failed with error code {assemble_proc.returncode}")

            if not object_path.exists():
                raise AssemblyError("Assembler did not create an object file")

            assembly = Assembly(
                hash=hash,
                arch=platform_cfg.arch,
                source_asm=asm,
                elf_object=object_path.read_bytes(),
            )
            assembly.save()
            return assembly


_compilers = load_compilers()
logger.info(f"Enabled {len(_compilers)} compiler(s): {', '.join(_compilers.keys())}")
_platforms = load_platforms()
logger.info(f"Available platform(s): {', '.join(CompilerWrapper.available_platforms().keys())}")
