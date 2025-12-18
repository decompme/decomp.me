#!/bin/sh

set -e

yarn install --frozen-lockfile

set +e
yarn dev
status=$?
set -e

if [ "$status" -ne 0 ]; then
  exit "$status"
fi

if grep -q '^oom_kill [1-9]' /sys/fs/cgroup/memory.events 2>/dev/null; then
  echo >&2 "Error: Process was killed due to running out of memory."
  exit 137
fi

exit 0
