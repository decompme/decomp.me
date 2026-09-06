#!/bin/bash
set -euo pipefail

exec uv run --locked python -m cromper.main
