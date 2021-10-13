from typing import Dict, List, Optional, Set, Tuple
from typing_extensions import OrderedDict
from coreapp.models import Asm, Assembly, Compilation
from coreapp import util
from coreapp.sandbox import Sandbox
from django.conf import settings
import json
import logging
import os
from pathlib import Path
import subprocess
from dataclasses import dataclass

logger = logging.getLogger(__name__)

ASM_PRELUDE: str = """
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
.set gp=64

"""

PATH: str
if settings.USE_SANDBOX_JAIL:
    PATH = "/bin:/usr/bin"
else:
    PATH = os.environ["PATH"]

def load_compilers() -> Dict[str, Dict[str, str]]:
    ret = {}

    compiler_dirs = next(os.walk(settings.COMPILER_BASE_PATH))
    for compiler_id in compiler_dirs[1]:
        config_path = Path(settings.COMPILER_BASE_PATH / compiler_id / "config.json")
        if config_path.exists():
            with open(config_path) as f:
                ret[compiler_id] = json.load(f)

    return ret


@dataclass
class Arch:
    name: str
    assemble_cmd: Optional[str] = None
    objdump_cmd: Optional[str] = None
    nm_cmd: Optional[str] = None


def load_arches() -> Dict[str, Arch]:
    return {
        "mips": Arch(
            "MIPS (Nintendo 64)",
            assemble_cmd='mips-linux-gnu-as -march=vr4300 -mabi=32 -o "$OUTPUT" "$INPUT"',
            objdump_cmd="mips-linux-gnu-objdump",
            nm_cmd="mips-linux-gnu-nm",
        ),
        "mipsel": Arch(
            "MIPS (LE)",
            assemble_cmd='mips-linux-gnu-as -march=mips64 -mabi=64 -o "$OUTPUT" "$INPUT"',
            objdump_cmd="mips-linux-gnu-objdump",
            nm_cmd="mips-linux-gnu-nm",
        ),
    }


_compilers = load_compilers()
_arches = load_arches()

def get_assemble_cmd(arch: str) -> Optional[str]:
    if arch in _arches:
        return _arches[arch].assemble_cmd
    return None

def get_nm_command(arch: str) -> Optional[str]:
    if arch in _arches:
        return _arches[arch].nm_cmd
    return None

def get_objdump_command(arch: str) -> Optional[str]:
    if arch in _arches:
        return _arches[arch].objdump_cmd
    return None

def _check_compilation_cache(*args: str) -> Tuple[Optional[Compilation], str]:
    hash = util.gen_hash(args)
    return Compilation.objects.filter(hash=hash).first(), hash


def _check_assembly_cache(*args: str) -> Tuple[Optional[Assembly], str]:
    hash = util.gen_hash(args)
    return Assembly.objects.filter(hash=hash).first(), hash


class CompilerWrapper:
    @staticmethod
    def base_path() -> Path:
        return settings.COMPILER_BASE_PATH

    @staticmethod
    def arch_from_compiler(compiler: str) -> Optional[str]:
        cfg = _compilers.get(compiler)
        return cfg["arch"] if cfg else None

    @staticmethod
    def available_compiler_ids() -> List[str]:
        return sorted(_compilers.keys())

    @staticmethod
    def available_compilers() -> Dict[str, Dict[str, Optional[str]]]:
        return {k: {"arch": CompilerWrapper.arch_from_compiler(k)} for k in CompilerWrapper.available_compiler_ids()}

    @staticmethod
    def available_arches() -> OrderedDict[str, str]:
        a_set: Set[str] = set()
        ret = OrderedDict()

        for id in CompilerWrapper.available_compiler_ids():
            a_set.add(_compilers[id]["arch"])

        for a in a_set:
            ret[a] = _arches[a].name

        return ret

    @staticmethod
    def filter_cc_opts(compiler: str, cc_opts: str) -> str:
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
        for flag in cc_opts.split():
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
    def compile_code(compiler: str, cc_opts: str, code: str, context: str, to_regenerate: Optional[Compilation] = None) -> Tuple[Optional[Compilation], Optional[str]]:
        if compiler not in _compilers:
            logger.debug(f"Compiler {compiler} not found")
            return (None, "ERROR: Compiler not found")

        code = code.replace("\r\n", "\n")
        context = context.replace("\r\n", "\n")

        if not to_regenerate:
            cached_compilation, hash = _check_compilation_cache(compiler, cc_opts, code, context)
            if cached_compilation:
                logger.debug(f"Compilation cache hit! hash: {hash}")
                return (cached_compilation, cached_compilation.stderr)

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

            compiler_path = CompilerWrapper.base_path() / compiler

            # Run compiler
            try:
                compile_proc = sandbox.run_subprocess(
                    _compilers[compiler]["cc"],
                    mounts=[compiler_path],
                    shell=True,
                    env={
                    "PATH": PATH,
                    "INPUT": sandbox.rewrite_path(code_path),
                    "OUTPUT": sandbox.rewrite_path(object_path),
                    "COMPILER_DIR": sandbox.rewrite_path(compiler_path),
                    "CC_OPTS": sandbox.quote_options(cc_opts),
                })
            except subprocess.CalledProcessError as e:
                # Compilation failed
                logging.debug("Compilation failed: " + e.stderr)
                return (None, e.stderr)

            if not object_path.exists():
                logger.error("Compiler did not create an object file")
                return (None, "ERROR: Compiler did not create an object file")

            if to_regenerate:
                compilation = to_regenerate
                compilation.elf_object=object_path.read_bytes(),
            else:
                # Store Compilation to db
                compilation = Compilation(
                    hash=hash,
                    compiler=compiler,
                    cc_opts=cc_opts,
                    source_code=code,
                    context=context,
                    elf_object=object_path.read_bytes(),
                    stderr=compile_proc.stderr
                )
            compilation.save()

            return (compilation, compile_proc.stderr)

    @staticmethod
    def assemble_asm(arch: str, asm: Asm, to_regenerate: Optional[Assembly] = None) -> Tuple[Optional[Assembly], Optional[str]]:
        if arch not in _arches:
            logger.error(f"Arch {arch} not found")
            return (None, f"Arch {arch} not found")

        assemble_cmd = get_assemble_cmd(arch)
        if not assemble_cmd:
            logger.error(f"Assemble command for arch {arch} not found")
            return (None, f"Assemble command for arch {arch} not found")

        # Use the cache if we're not manually re-running an Assembly
        if not to_regenerate:
            cached_assembly, hash = _check_assembly_cache(arch, asm.hash)
            if cached_assembly:
                logger.debug(f"Assembly cache hit! hash: {hash}")
                return (cached_assembly, None)

        arch_cfg = _arches[arch]

        with Sandbox() as sandbox:
            asm_path = sandbox.path / "asm.s"
            asm_path.write_text(ASM_PRELUDE + asm.data)

            object_path = sandbox.path / "object.o"

            # Run assembler
            try:
                assemble_proc = sandbox.run_subprocess(
                    arch_cfg.assemble_cmd,
                    mounts=[],
                    shell=True,
                    env={
                    "PATH": PATH,
                    "INPUT": sandbox.rewrite_path(asm_path),
                    "OUTPUT": sandbox.rewrite_path(object_path),
                })
            except subprocess.CalledProcessError as e:
                # Compilation failed
                logger.exception("Error running asm-differ")
                return (None, e.stderr)

            # Assembly failed
            if assemble_proc.returncode != 0:
                return (None, assemble_proc.stderr)

            if not object_path.exists():
                logger.error("Assembler did not create an object file")
                return (None, "Assembler did not create an object file")

            if to_regenerate:
                assembly = to_regenerate
                assembly.elf_object = object_path.read_bytes()
            else:
                assembly = Assembly(
                    hash=hash,
                    arch=arch,
                    source_asm=asm,
                    elf_object=object_path.read_bytes(),
                )
            assembly.save()

            return (assembly, None)
