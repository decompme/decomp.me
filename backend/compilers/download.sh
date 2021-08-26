#!/bin/bash
set -euo pipefail

compiler_dir="$(dirname "${BASH_SOURCE[0]}")"

uname="$(uname)"
if [[ "$uname" == "Darwin" ]]; then
    os="mac"
else
    os="linux"
fi

# gcc2.8.1
curl -L "https://github.com/pmret/gcc-papermario/releases/download/master/$os.tar.gz" | tar zx -C "$compiler_dir/gcc2.8.1"
curl -L "https://github.com/pmret/binutils-papermario/releases/download/master/$os.tar.gz" | tar zx -C "$compiler_dir/gcc2.8.1"
