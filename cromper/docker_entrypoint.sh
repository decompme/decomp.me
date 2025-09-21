#!/bin/bash

# Initialize wine if available
if command -v regedit &> /dev/null; then
  if [ -d /cromper/wine ]; then
    for reg in /cromper/wine/*.reg; do
      if [ -f "$reg" ]; then
        echo "Importing registry file $reg..."
        regedit "$reg"
      fi
    done
  fi
else
  echo "regedit command not found. Skipping registry import."
fi

# Start cromper service
exec uv run python -m cromper.main
