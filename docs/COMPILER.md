# Adding a Compiler

Use this checklist when adding a new compiler to decomp.me:

- [ ] Raise a PR to add the compiler package to the [`decompme/compilers`](https://github.com/decompme/compilers) repository.
- [ ] Add an appropriate entry to [cromper/compilers/compilers.linux.yaml](/cromper/compilers/compilers.linux.yaml) so Cromper can download/install it.
- [ ] Add the compiler definition to [cromper/cromper/compilers.py](/cromper/cromper/compilers.py) so Cromper can use it.
  - Provide the command used to run the compiler.
  - Add the compiler to the `_all_compilers` list.
- [ ] Add the user-friendly compiler name to [frontend/src/lib/i18n/locales/en/compilers.json](/frontend/src/lib/i18n/locales/en/compilers.json).
- [ ] Test that it works as expected
- [ ] *OPTIONAL*: Add any new compiler flags to [backend/coreapp/flags.py](/backend/coreapp/flags.py).

**NOTE**: The compiler key must be consistent across the Cromper compiler definition,
the downloaded compiler config, and the frontend display name.

## Examples

Here are some PRs you can use as a reference:
 - https://github.com/decompme/decomp.me/pull/1962/changes
 - https://github.com/decompme/decomp.me/pull/1877/changes
 - https://github.com/decompme/decomp.me/pull/1847/changes
