#!/bin/bash
set -euo pipefail

uv sync

exec /cromper/.venv/bin/python -m cromper.main
