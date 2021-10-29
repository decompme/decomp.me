#!/bin/bash
set -euo pipefail

compiler_dir="$(dirname "${BASH_SOURCE[0]}")"

uname="$(uname)"
if [[ "$uname" == "Darwin" ]]; then
    os="mac"
    ido_os="macos"
else
    os="linux"
    ido_os="ubuntu"
fi

# gcc2.8.1
mkdir -p "$compiler_dir/gcc2.8.1"
curl -L "https://github.com/pmret/gcc-papermario/releases/download/master/$os.tar.gz" | tar zx -C "$compiler_dir/gcc2.8.1"
curl -L "https://github.com/pmret/binutils-papermario/releases/download/master/$os.tar.gz" | tar zx -C "$compiler_dir/gcc2.8.1"

# ido5.3
mkdir -p "$compiler_dir/ido5.3"
curl -L "https://github.com/ethteck/ido-static-recomp/releases/download/master/ido-5.3-recomp-$ido_os-latest.tar.gz" | tar zx -C "$compiler_dir/ido5.3"

# ido7.1
mkdir -p "$compiler_dir/ido7.1"
curl -L "https://github.com/ethteck/ido-static-recomp/releases/download/master/ido-7.1-recomp-$ido_os-latest.tar.gz" | tar zx -C "$compiler_dir/ido7.1"

# psyq (ps1)
if [[ "$uname" != "Darwin" ]]; then
    curl -L "https://github.com/mkst/esa/releases/download/psyq-binaries/psyq-compilers.tar.gz" | tar zx -C "$compiler_dir"
    curl -L "https://github.com/mkst/esa/releases/download/binutils-2.251/binutils-2.25.1.tar.gz" | tar zx -C $compiler_dir/psyq4.1 usr/local/bin/mips-elf-as --strip-components 3
    cp $compiler_dir/psyq4.1/mips-elf-as $compiler_dir/psyq4.3/mips-elf-as
    cp $compiler_dir/psyq4.1/mips-elf-as $compiler_dir/psyq4.6/mips-elf-as
fi
