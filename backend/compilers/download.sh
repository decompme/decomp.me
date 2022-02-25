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

# gcc2.7kmc
if [[ "$uname" != "Darwin" ]]; then
    mkdir -p "$compiler_dir/gcc2.7kmc"
    curl -L "https://github.com/Mr-Wiseguy/kmc-gcc-wrapper/releases/download/master/kmc-gcc-wrapper-ubuntu-latest.tar.gz" | tar zx -C "$compiler_dir/gcc2.7kmc"
fi

# psyq (ps1)
if [[ "$uname" != "Darwin" ]]; then
    curl -L "https://github.com/mkst/esa/releases/download/psyq-binaries/psyq-compilers.tar.gz" | tar zx -C "$compiler_dir"
    # copy in object converter
    cp $compiler_dir/psyq-obj-parser $compiler_dir/psyq4.0/
    cp $compiler_dir/psyq-obj-parser $compiler_dir/psyq4.1/
    cp $compiler_dir/psyq-obj-parser $compiler_dir/psyq4.6/
    rm $compiler_dir/psyq-obj-parser

    # psyq flavours of gcc
    mkdir -p $compiler_dir/gcc2.7.2-psyq/ && cp $compiler_dir/psyq4.1/CC1PSX.EXE $compiler_dir/gcc2.7.2-psyq/
    mkdir -p $compiler_dir/gcc2.8.1-psyq/ && cp $compiler_dir/psyq4.3/CC1PSX.EXE $compiler_dir/gcc2.8.1-psyq/
    mkdir -p $compiler_dir/gcc2.95.2-psyq/ && cp $compiler_dir/psyq4.6/CC1PSX.EXE $compiler_dir/gcc2.95.2-psyq/
    curl -L "https://github.com/mkst/esa/releases/download/binutils-2.251/binutils-2.25.1.tar.gz" | tar zx -C "$compiler_dir" usr/local/bin/mips-elf-as --strip-components 3
    cp $compiler_dir/mips-elf-as $compiler_dir/gcc2.7.2-psyq/
    cp $compiler_dir/mips-elf-as $compiler_dir/gcc2.8.1-psyq/
    cp $compiler_dir/mips-elf-as $compiler_dir/gcc2.95.2-psyq/
    rm $compiler_dir/mips-elf-as

    find $compiler_dir/*psyq* -name "*.EXE" -or -name "*.exe" | xargs chmod +x
fi

# GCC mipsel
if [[ "$uname" != "Darwin" ]]; then
    mkdir -p "$compiler_dir/gcc2.6.3-mipsel"
    curl -L -o gcc-2.6.3.zip "https://github.com/decompals/old-gcc/releases/download/release/gcc-2.6.3.zip" && unzip gcc-2.6.3.zip -d "$compiler_dir/gcc2.6.3-mipsel" && rm gcc-2.6.3.zip
    chmod +x $compiler_dir/gcc2.6.3-mipsel/*
fi

