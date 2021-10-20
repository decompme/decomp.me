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

# windows compilers need i386 wine
ARG ENABLE_PS1_SUPPORT
ARG ENABLE_GC_WII_SUPPORT
RUN if [ "${ENABLE_PS1_SUPPORT}" = "YES" ] || [ "${ENABLE_GC_WII_SUPPORT}" = "YES" ] ; then \
    dpkg --add-architecture i386 && apt-get update && \
    apt-get install -y -o APT::Immediate-Configure=false \
        wine; \
    fi

# ps1 specifics
RUN if [ "${ENABLE_PS1_SUPPORT}" = "YES" ] ; then \
    apt-get install -y dos2unix; \
    fi

# gc/wii specifics
RUN if [ "${ENABLE_GC_WII_SUPPORT}" = "YES" ] ; then \
    wget https://github.com/devkitPro/pacman/releases/download/v1.0.2/devkitpro-pacman.amd64.deb \
        -O devkitpro.deb && \
    echo ebc9f199da9a685e5264c87578efe29309d5d90f44f99f3dad9dcd96323fece3 devkitpro.deb | sha256sum --check && \
    apt install -y ./devkitpro.deb && \
    rm devkitpro.deb && \
    dkp-pacman -Syu devkitPPC --noconfirm && \
    cp /opt/devkitpro/devkitPPC/bin/powerpc* /usr/bin/ && \
    rm -rf /opt/devkitpro; \
    fi

WORKDIR /backend

ENTRYPOINT ["/backend/docker_entrypoint.sh"]

# TODO: nginx server to proxy-pass frontend/backend in order to preserve cookies
