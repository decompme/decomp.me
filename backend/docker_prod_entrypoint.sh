#!/bin/bash

DB_HOST=${DATABASE_HOST:-postgres}
DB_PORT=${DATABASE_PORT:-5432}

BE_HOST=${BACKEND_HOST:-0.0.0.0}
BE_PORT=${BACKEND_PORT:-8000}

WORKERS=${BACKEND_WORKERS:-4}

until nc -z ${DB_HOST} ${DB_PORT} > /dev/null; do
  echo "Waiting for database to become available on ${DB_HOST}:${DB_PORT}..."
  sleep 1
done

poetry run /backend/manage.py migrate

if command -v regedit &> /dev/null; then
  for reg in /backend/wine/*.reg; do
    echo "Importing registry file $reg..."
    regedit $reg
  done
else
  echo "regedit command not found. Skipping registry import."
fi

poetry run gunicorn -w ${WORKERS} decompme.wsgi --bind ${BE_HOST}:${BE_PORT}
