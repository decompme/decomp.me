#!/bin/bash
set -euo pipefail

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "Starting cromper service..."
echo "Port: ${CROMPER_PORT:-8888}"
echo "Debug: ${CROMPER_DEBUG:-false}"
echo "Use sandbox jail: ${USE_SANDBOX_JAIL:-false}"

# Start the cromper service
uv run python -m cromper.main