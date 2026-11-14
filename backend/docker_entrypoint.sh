#!/bin/bash

DB_HOST=${DATABASE_HOST:-postgres}
DB_PORT=${DATABASE_PORT:-5432}

BE_HOST=${BACKEND_HOST:-0.0.0.0}
BE_PORT=${BACKEND_PORT:-8000}

uv sync

until nc -z ${DB_HOST} ${DB_PORT} > /dev/null; do
  echo "Waiting for database to become available on ${DB_HOST}:${DB_PORT}..."
  sleep 1
done

uv run /backend/manage.py migrate

if [ -n "${BACKEND_DEBUGPY:-}" ]; then
  # Autoreload is disabled so debugpy can attach to the process serving the app.
  uv run python -m debugpy --listen 0.0.0.0:5678 -m uvicorn decompme.asgi:application --host ${BE_HOST} --port ${BE_PORT}
else
  uv run uvicorn decompme.asgi:application --host ${BE_HOST} --port ${BE_PORT} --reload --reload-dir /backend/coreapp --reload-dir /backend/decompme
fi
