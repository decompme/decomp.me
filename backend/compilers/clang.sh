
compiler_dir="$(dirname $(readlink -f "${BASH_SOURCE[0]}"))"

uname="$(uname)"

# clang-4.0.1
if [[ "$uname" == "Darwin" ]]; then
    curl -L "https://releases.llvm.org/4.0.1/clang+llvm-4.0.1-x86_64-apple-darwin.tar.xz" | tar xJ -C "$compiler_dir"
    mv "$compiler_dir/clang+llvm-4.0.1-x86_64-apple-darwin/" "$compiler_dir/clang-4.0.1"
else
    curl -L "https://releases.llvm.org/4.0.1/clang+llvm-4.0.1-x86_64-linux-gnu-debian8.tar.xz" | tar xJ -C "$compiler_dir"
    mv "$compiler_dir/clang+llvm-4.0.1-x86_64-linux-gnu-debian8/" "$compiler_dir/clang-4.0.1"
fi

