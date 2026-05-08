# This image intentionally targets amd64 because Wine/wine32 and the bundled
# compiler/binutils artifacts are x86 Linux binaries.
FROM --platform=linux/amd64 ubuntu:24.04 AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*

FROM base AS python312

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python-is-python3 \
    python3 \
    python3.12-dev \
    python3.12-venv \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.9.11 /uv /bin/uv

FROM base AS nsjail

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    autoconf \
    bison \
    flex \
    g++ \
    gcc \
    git \
    libnl-route-3-dev \
    libprotobuf-dev \
    libtool \
    make \
    pkg-config \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

RUN git clone "https://github.com/google/nsjail" \
    --recursive --branch 3.6 /nsjail \
    && cd /nsjail \
    && make

FROM base AS binutils

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    binutils-aarch64-linux-gnu \
    binutils-arm-none-eabi \
    binutils-djgpp \
    binutils-mingw-w64-i686 \
    binutils-mips-linux-gnu \
    binutils-mipsel-linux-gnu \
    binutils-powerpc-linux-gnu \
    binutils-sh-elf \
    binutils-x86-64-linux-gnu \
    bzip2 \
    libarchive-tools \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir /binutils /binutils-libs

RUN cp /usr/bin/*-as /binutils/ \
    && cp /usr/bin/*-objcopy /binutils/ \
    && cp /usr/bin/*-objdump /binutils/ \
    && cp /usr/bin/*-nm /binutils/

RUN cp /lib/x86_64-linux-gnu/libbfd*.so* /binutils-libs/ \
    && cp /lib/x86_64-linux-gnu/libctf*.so* /binutils-libs/ \
    && cp /lib/x86_64-linux-gnu/libopcodes*.so* /binutils-libs/ \
    && cp /lib/x86_64-linux-gnu/libsframe*.so* /binutils-libs/

WORKDIR /binutils

# Patched mips binutils
RUN ARCHIVE=binutils-mips-ps2-decompals-linux-x86-64.tar.gz; \
    URL=https://github.com/decompals/binutils-mips-ps2-decompals/releases/download/v0.8/$ARCHIVE; \
    SHA256=40f8dda9caae9ec2cd88811d7c4a322d5dd0fa9fe3b65ef6c9280c96b58415ea; \
    wget -O "$ARCHIVE" "$URL" \
    && echo "$SHA256  $ARCHIVE" | sha256sum -c - \
    && tar xvzf "$ARCHIVE" mips-ps2-decompals-as mips-ps2-decompals-nm mips-ps2-decompals-objdump \
    && rm "$ARCHIVE" \
    && chmod +x mips-ps2-decompals-*

# Patched PowerPC binutils
RUN ARCHIVE=linux-x86_64.zip; \
    URL=https://github.com/encounter/gc-wii-binutils/releases/download/2.42-2/$ARCHIVE; \
    SHA256=64e4bf7aee5c06075d8fa818ebd2a0a3a72e0eeef3896bdec2f198b0e950fe63; \
    wget -O "$ARCHIVE" "$URL" \
    && echo "$SHA256  $ARCHIVE" | sha256sum -c - \
    && bsdtar -xvf "$ARCHIVE" powerpc-eabi-as powerpc-eabi-nm powerpc-eabi-objdump \
    && rm "$ARCHIVE" \
    && chmod +x powerpc-eabi-*

# Xbox 360 (Xenon) PowerPC binutils
RUN ARCHIVE=linux-x86_64.zip; \
    URL=https://github.com/encounter/xbox360-binutils/releases/download/2.45.1-1/$ARCHIVE; \
    SHA256=33e01b228787ed507ebd08755370d5dac2053c2a37b0647a48c6c19cc528218c; \
    wget -O "$ARCHIVE" "$URL" \
    && echo "$SHA256  $ARCHIVE" | sha256sum -c - \
    && bsdtar -xvf "$ARCHIVE" powerpc-xenon-pe-as powerpc-xenon-pe-nm powerpc-xenon-pe-objdump \
    && rm "$ARCHIVE" \
    && chmod +x powerpc-xenon-pe-*

# MSDOS specific
RUN ARCHIVE=omftools.tar.gz; \
    URL=https://github.com/OmniBlade/binutils-gdb/releases/download/omf-build/$ARCHIVE; \
    SHA256=b17dbbd3ee257bb870731df141ca44dde7eedee44d79294ab2acd1bccfed7834; \
    wget -O "$ARCHIVE" "$URL" \
    && echo "$SHA256  $ARCHIVE" | sha256sum -c - \
    && tar xvzf "$ARCHIVE" jwasm \
    && rm "$ARCHIVE"
RUN ARCHIVE=omftools-linux-x86_64.tar.gz; \
    URL=https://github.com/decompals/binutils-omf/releases/download/v0.4/$ARCHIVE; \
    SHA256=d3a2e95e2b6079bb444f4f8f4d2d798954c58b2e7e59fb10523538696133b0c7; \
    wget -O "$ARCHIVE" "$URL" \
    && echo "$SHA256  $ARCHIVE" | sha256sum -c - \
    && tar xvzf "$ARCHIVE" omf-nm omf-objdump \
    && rm "$ARCHIVE"

# Android binutils
RUN ARCHIVE=android-ndk-r8e-linux-x86_64.tar.bz2; \
    URL=https://github.com/decompme/compilers/releases/download/compilers/$ARCHIVE; \
    SHA256=126dce67022049dca1be063ea0f8a6c07070f9f0b139339fc9e6a8ff617ed7fc; \
    wget -O "$ARCHIVE" "$URL" \
    && echo "$SHA256  $ARCHIVE" | sha256sum -c - \
    && bash -c 'tar xjvf "$0" --strip-components=5 toolchains/x86-4.7/prebuilt/linux-x86_64/bin/i686-linux-android-{as,nm,objdump}' "$ARCHIVE" \
    && rm "$ARCHIVE"


FROM python312 AS dependencies

RUN dpkg --add-architecture i386 \
    && add-apt-repository -y ppa:dosemu2/ppa \
    && add-apt-repository -y ppa:stsp-0/dj64 \
    && apt-get update \
    && apt-get install -y -o APT::Immediate-Configure=false --no-install-recommends \
    cpp \
    dj64 \
    dos2unix \
    dosemu2 \
    iptables \
    libc6-dev-i386 \
    libnl-route-3-200 \
    libprotobuf32t64 \
    libtinfo6 \
    netcat-traditional \
    wget \
    wine \
    wine32:i386 \
    && rm -rf /var/lib/apt/lists/*

# NOTE: libtinfo5 is required for clang
RUN ARCHIVE=libtinfo5_6.3-2ubuntu0.1_amd64.deb; \
    URL=https://security.ubuntu.com/ubuntu/pool/universe/n/ncurses/$ARCHIVE; \
    SHA256=ab89265d8dd18bda6a29d7c796367d6d9f22a39a8fa83589577321e7caf3857b; \
    wget -O "$ARCHIVE" "$URL" \
    && echo "$SHA256  $ARCHIVE" | sha256sum -c - \
    && apt install "./$ARCHIVE" \
    && rm "$ARCHIVE"

RUN mkdir -p /etc/fonts

ENV WINEPREFIX=/tmp/wine

# Ensure /sandbox and wine dirs have correct ownership
RUN mkdir -p /sandbox \
    && chown -R ubuntu:ubuntu /sandbox \
    && mkdir -p "${WINEPREFIX}" \
    && chown ubuntu:ubuntu "${WINEPREFIX}"

# Switch to non-root user
USER ubuntu

# Initialize wine files to /home/ubuntu/.wine
RUN wineboot --init

COPY --from=nsjail /nsjail/nsjail /bin/nsjail

COPY --from=binutils /binutils/ /usr/bin/
COPY --from=binutils /binutils-libs/ /usr/lib/x86_64-linux-gnu/

COPY --from=ghcr.io/decompals/wibo:1.0.1 /usr/local/bin/wibo /usr/bin/

WORKDIR /backend


FROM dependencies AS dev

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

USER ubuntu

ENTRYPOINT ["/backend/docker_entrypoint.sh"]


FROM python312 AS uv-install

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

USER ubuntu

WORKDIR /backend

COPY pyproject.toml uv.lock /backend/

RUN uv sync --locked --no-dev


FROM dependencies AS prod

COPY --from=uv-install /backend/.venv /backend/.venv

COPY manage.py /backend
COPY housekeeping.py /backend

COPY wine /backend/wine
COPY decompme /backend/decompme
COPY libraries /backend/libraries
COPY compilers /backend/compilers

COPY coreapp /backend/coreapp

COPY docker_prod_entrypoint.sh /backend/docker_prod_entrypoint.sh

ENTRYPOINT ["/backend/docker_prod_entrypoint.sh"]
