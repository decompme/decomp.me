#!/bin/bash
set -euo pipefail
set -x

compiler_dir="$(dirname "${BASH_SOURCE[0]}")"

uname="$(uname)"
if [[ "$uname" == "Darwin" ]]; then
    package_ver="apple-darwin"
else
    package_ver="linux-gnu-debian8"
fi

# clang-4.0.1
mkdir -p "$compiler_dir/clang-4.0.1"
archive_name="clang+llvm-4.0.1-x86_64-$package_ver"
curl -L "https://releases.llvm.org/4.0.1/"$archive_name".tar.xz" | tar xJ --strip 1 -C "$compiler_dir"/clang-4.0.1

# clang-3.9.1 (needs 4.0.1 installed, so downloading it after)
mkdir -p "$compiler_dir/clang-3.9.1"
if [[ "$uname" != "Darwin" ]]; then
    archive_name="clang+llvm-3.9.1-x86_64-$package_ver"
    curl -L "https://releases.llvm.org/3.9.1/$archive_name.tar.xz" | tar xJ --strip 1 -C "$compiler_dir"/clang-3.9.1
    cp "$compiler_dir"/clang-4.0.1/bin/ld.lld "$compiler_dir"/clang-3.9.1/bin/ld.lld
fi
