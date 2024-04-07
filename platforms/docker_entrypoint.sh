#!/bin/bash

# TODO: check if download.py is already running for the platform (i.e. we have more than 1 instance)
#       or do we do a check in download.py ?
#       e.g. if a temp file exists and is newer than e.g. 5 minutes, we assume another process is running and fast exit
#            otherwise touch the temp file and continue, and delete the temp file at the end

if [[ "${SUPPORTED_PLATFORMS}x" == "x" ]]; then
    # TODO:
    echo "Downloading all compilers..."

else
    # TODO:
    echo "Downloading compilers for ${SUPPORTED_PLATFORMS}..."

fi

# TODO: download libraries... should we have libraries per platform instead of globally?

python3 main.py
