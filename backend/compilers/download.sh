#!/bin/bash
set -euo pipefail

compiler_dir="$(dirname "${BASH_SOURCE[0]}")"

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
