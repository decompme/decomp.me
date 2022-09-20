#!/bin/bash

set -e

cd ../backend && \
    poetry install --with electron && \
    poetry run pyinstaller ../electron/backend.spec --distpath ../electron/dist
