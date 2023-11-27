#!/bin/bash

DB_HOST=${DATABASE_HOST:-postgres}
DB_PORT=${DATABASE_PORT:-5432}

BE_HOST=${BACKEND_HOST:-0.0.0.0}
BE_PORT=${BACKEND_PORT:-8000}

poetry config virtualenvs.path /backend/virtualenvs

poetry install

poetry run /backend/compilers/download.py
poetry run /backend/libraries/download.py

until nc -z ${DB_HOST} ${DB_PORT} > /dev/null; do
  echo "Waiting for database to become available on ${DB_HOST}:${DB_PORT}..."
  sleep 1
done

poetry run /backend/manage.py migrate

poetry run /backend/manage.py runserver ${BE_HOST}:${BE_PORT}
