FROM ubuntu:22.04 as base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    python3-pip \
    python3 \
    python-is-python3 \
    python3.10-venv \
    python3.10-dev


FROM base AS nsjail

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
    protobuf-compiler

RUN git clone "https://github.com/google/nsjail" --recursive --branch 3.1 /nsjail \
    && cd /nsjail \
    && make


FROM base as build

# user
RUN useradd --create-home user \
    && mkdir -p /sandbox \
    && chown -R user:user /sandbox

# wine
RUN mkdir -p /etc/fonts
ENV WINEPREFIX=/tmp/wine

RUN mkdir -p "${WINEPREFIX}" \
    && chown user:user "${WINEPREFIX}"

RUN dpkg --add-architecture i386 && apt-get update && \
    apt-get install -y -o APT::Immediate-Configure=false \
    wine

USER user
RUN wineboot --init
# end of wine

USER root

# common packages (nsjail deps)
RUN apt-get -y update && apt-get install -y \
    libprotobuf-dev \
    libnl-route-3-200

# platform specific packages
RUN apt-get -y update && apt-get install -y \
    ca-certificates \
    software-properties-common && \
    add-apt-repository -y ppa:dosemu2/ppa && \
    add-apt-repository -y ppa:stsp-0/dj64 && \
    apt-get update && \
    apt-get install -y dosemu2 dj64

RUN apt-get -y update && apt-get install -y \
    binutils-sh-elf \
    dos2unix

# nsjail
COPY --from=nsjail /nsjail/nsjail /bin/nsjail

# wibo
COPY --from=ghcr.io/decompals/wibo:0.6.13 /usr/local/sbin/wibo /usr/bin/

# python packages
COPY requirements.txt /requirements.txt

USER user

RUN python3 -m pip install --user -r /requirements.txt

ARG SUPPORTED_PLATFORMS
ENV SUPPORTED_PLATFORMS=${SUPPORTED_PLATFORMS}

WORKDIR /platforms

ENTRYPOINT ["/platforms/docker_entrypoint.sh"]
