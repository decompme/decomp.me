from typing import Optional, Tuple
from coreapp.models import Asm, Assembly, Compilation
from coreapp import util
from coreapp.sandbox import Sandbox
from django.conf import settings
import json
import logging
import os
from pathlib import Path
import subprocess

logger = logging.getLogger(__name__)

ASM_PRELUDE: str = """
.macro glabel label
    .global \label
    .type \label, @function
    \label:
.endm
.set noat
.set noreorder
.set gp=64

"""

def load_compilers() -> dict:
    ret = {}

    compiler_dirs = next(os.walk(settings.COMPILER_BASE_PATH))
    for compiler_id in compiler_dirs[1]:
        config_path = Path(settings.COMPILER_BASE_PATH / compiler_id / "config.json")
        if config_path.exists():
            with open(config_path) as f:
                ret[compiler_id] = json.load(f)

    return ret

def load_arches() -> dict:
    ret = {}

    ret["mips"] = "mips-linux-gnu-as -march=vr4300 -mabi=32 -o \"$OUTPUT\" \"$INPUT\""

    return ret

compilers = load_compilers()
arches = load_arches()

def check_compilation_cache(*args) -> Optional[Compilation]:
    hash = util.gen_hash(args)
    return Compilation.objects.filter(hash=hash).first(), hash

def check_assembly_cache(*args) -> Optional[Compilation]:
    hash = util.gen_hash(args)
    return Assembly.objects.filter(hash=hash).first(), hash

class CompilerWrapper:
    def base_path():
        return settings.COMPILER_BASE_PATH

    @staticmethod
    def arch_from_compiler(compiler: str) -> Optional[str]:
        cfg = compilers.get(compiler)
        return cfg["arch"] if cfg else None

    def cc_opts_from_command(compiler: str, compile_command: str) -> str:
        cfg = compilers[compiler]
        # TODO: use cfg for this?
        interesting_flags = {
            "-O",
            "-O1",
            "-O2",
            "-O3",
            "-g",
            "-g1",
            "-g2",
            "-g3",
            "-mips1",
            "-mips2",
            "-mips3",
            "-fforce-addr",
        }
        return " ".join(
            flag for flag in compile_command.split() if flag in interesting_flags
        )

    @staticmethod
    def compile_code(compiler: str, cc_opts: str, code: str, context: str, to_regenerate: Compilation = None):
        if compiler not in compilers:
            logger.debug(f"Compiler {compiler} not found")
            return (None, "ERROR: Compiler not found")

        compiler_cfg = compilers[compiler]

        if not to_regenerate:
            cached_compilation, hash = check_compilation_cache(compiler, cc_opts, code, context)
            if cached_compilation:
                logger.debug(f"Compilation cache hit!")
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
                    compiler_cfg["cc"],
                    mounts=[compiler_path],
                    shell=True,
                    env={
                    "PATH": "/bin:/usr/bin",
                    "INPUT": sandbox.rewrite_path(code_path),
                    "OUTPUT": sandbox.rewrite_path(object_path),
                    "COMPILER_DIR": sandbox.rewrite_path(compiler_path),
                    "CC_OPTS": sandbox.quote_options(cc_opts),
                })
            except subprocess.CalledProcessError as e:
                # Compilation failed
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
    def assemble_asm(arch: str, as_opts: str, asm: Asm, to_regenerate:Assembly = None) -> Tuple[Optional[Assembly], Optional[str]]:
        if arch not in arches:
            logger.error(f"Arch {arch} not found")
            return (None, "arch not found")

        # Use the cache if we're not manually re-running an Assembly
        if not to_regenerate:
            cached_assembly, hash = check_assembly_cache(arch, as_opts, asm)
            if cached_assembly:
                logger.debug(f"Assembly cache hit!")
                return (cached_assembly, None)

        arch_cfg = arches[arch]

        with Sandbox() as sandbox:
            asm_path = sandbox.path / "asm.s"
            asm_path.write_text(ASM_PRELUDE + asm.data)

            object_path = sandbox.path / "object.o"

            # Run assembler
            try:
                assemble_proc = sandbox.run_subprocess(
                    arch_cfg,
                    mounts=[],
                    shell=True,
                    env={
                    "INPUT": sandbox.rewrite_path(asm_path),
                    "OUTPUT": sandbox.rewrite_path(object_path),
                    "AS_OPTS": sandbox.quote_options(as_opts),
                })
            except subprocess.CalledProcessError as e:
                # Compilation failed
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
                    as_opts=as_opts,
                    source_asm=asm,
                    elf_object=object_path.read_bytes(),
                )
            assembly.save()

            return (assembly, None)
