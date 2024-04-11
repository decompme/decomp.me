#!/bin/bash

# TODO: check if download.py is already running for the platform (i.e. we have more than 1 instance)
#       or do we do a check in download.py ?
#       e.g. if a temp file exists and is newer than e.g. 5 minutes, we assume another process is running and fast exit
#            otherwise touch the temp file and continue, and delete the temp file at the end

if [[ "${SUPPORTED_PLATFORMS}x" == "x" ]]; then
    echo "Downloading all compilers/libraries..."
    # python3 compilers/download.py
    # python3 libraries/download.py

else
    echo "Downloading compilers/libraries for ${SUPPORTED_PLATFORMS}..."
    # python3 compilers/download.py --platforms ${SUPPORTED_PLATFORMS}
    # python3 libraries/download.py --platforms ${SUPPORTED_PLATFORMS}

fi

# do we need to wait for anything to come up?

python3 main.py
