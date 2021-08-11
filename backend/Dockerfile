FROM ghcr.io/google/nsjail/nsjail:latest AS nsjail

FROM python:3.9 AS build

RUN apt-get -y update && apt-get install -y \
    binutils-mips-linux-gnu \
    libnl-route-3-200 \
    netcat \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /backend/requirements.txt

RUN python3 -m pip install -r /backend/requirements.txt --no-cache-dir

# FIXME: This is very fragile, and mixes libraries from Ubuntu 18.04 w/ Debian Buster
COPY --from=nsjail /bin/nsjail /bin/nsjail
COPY --from=nsjail /usr/lib/x86_64-linux-gnu/libprotobuf.so.10.0.0 /usr/lib/x86_64-linux-gnu/libprotobuf.so.10 

RUN mkdir -p /jail/tmp && chmod a+rwx /jail /jail/tmp

WORKDIR /backend

ENTRYPOINT ["/backend/docker_entrypoint.sh"]
