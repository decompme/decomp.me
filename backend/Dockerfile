FROM python:3.9-buster AS nsjail

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

FROM python:3.9-buster AS build

RUN apt-get -y update && apt-get install -y \
    binutils-mips-linux-gnu \
    libnl-route-3-200 \
    libprotobuf17 \
    netcat \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /backend/requirements.txt

RUN python3 -m pip install -r /backend/requirements.txt --no-cache-dir

COPY --from=nsjail /bin/nsjail /bin/nsjail

# nsjail wants to mount this so ensure it exists
RUN mkdir -p /lib32

COPY compilers/download.sh /compilers/

RUN bash /compilers/download.sh

# ps1 specifics
ARG ENABLE_PS1_SUPPORT
RUN if [ "${ENABLE_PS1_SUPPORT}" = "YES" ] ; then \
    dpkg --add-architecture i386 && apt-get update && \
    apt-get install -y -o APT::Immediate-Configure=false \
        dos2unix \
        wine && \
    curl -L https://github.com/mkst/esa/releases/download/binutils-2.251/binutils-2.25.1.tar.gz | \
        tar zx -C /usr/bin --strip-components 3; fi

WORKDIR /backend

ENTRYPOINT ["/backend/docker_entrypoint.sh"]

# TODO: nginx server to proxy-pass frontend/backend in order to preserve cookies
