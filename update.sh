#!/usr/bin/env bash

set -euo pipefail
set -x

usage() {
  echo "Usage: update.sh [<image-tag>|auto] [deploy|migrate]" >&2
  exit 2
}

TAG="${1:-auto}"
COMMAND="${2:-deploy}"

case "${COMMAND}" in
  deploy|migrate) ;;
  *) usage ;;
esac

cd "$(dirname "$0")"

# Keep track of current git hash
OLD_HASH=$(git rev-parse --short HEAD)

# Fetch the latest production revision
git fetch origin main

if [ "${TAG}" = "auto" ]; then
  TAG=$(git rev-parse --short=12 origin/main)

  # Avoid tracing the read command/prompt.
  set +x
  read -r -p "Deploy ${TAG} from origin/main? [Y/n] " REPLY
  set -x

  case "${REPLY:-y}" in
    [Yy]|[Yy][Ee][Ss]) ;;
    *)
      echo "Deployment cancelled."
      exit 0
      ;;
  esac
fi

# Update the repo
git reset --hard origin/main
NEW_HASH=$(git rev-parse --short HEAD)

# Update compilers and libraries
python3 cromper/compilers/download.py
python3 cromper/libraries/download.py

python3 deploy.py "${COMMAND}" "${TAG}"

if [ "${OLD_HASH}" = "${NEW_HASH}" ]; then
  echo "No changes to publish to Discord..."
elif [ -f send_update.py ]; then
  python3 send_update.py "${OLD_HASH}" "${NEW_HASH}"
else
  echo "Repo updated from ${OLD_HASH} to ${NEW_HASH}; send_update.py not found."
fi

