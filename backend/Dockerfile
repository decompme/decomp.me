FROM python:3.9 AS nsjail

RUN apt-get -y update && apt-get install -y \
    autoconf \
    bison \
    flex \
    gcc \
    g++ \
    git \
    libprotobuf-dev \
    libnl-route-3-dev \
    libtool \
    make \
    pkg-config \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

RUN git clone --recursive --shallow-submodules --depth=1 --branch=3.0 "https://github.com/google/nsjail" /nsjail \
    && cd /nsjail \
    && make \
    && mv /nsjail/nsjail /bin \
    && rm -rf -- /nsjail

FROM python:3.9 AS build

RUN apt-get -y update && apt-get install -y \
    binutils-mips-linux-gnu \
    libnl-route-3-200 \
    libprotobuf17 \
    netcat \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /backend/requirements.txt

RUN python3 -m pip install -r /backend/requirements.txt --no-cache-dir

COPY --from=nsjail /bin/nsjail /bin/nsjail

WORKDIR /backend

ENTRYPOINT ["/backend/docker_entrypoint.sh"]
