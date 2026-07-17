# This image intentionally defaults to amd64 because the bundled
# compiler/binutils artifacts are x86 Linux binaries.
ARG CROMPER_PLATFORM=linux/amd64
FROM --platform=$CROMPER_PLATFORM ubuntu:26.04 AS base

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    ca-certificates \
    software-properties-common \
    && rm -rf /var/lib/apt/lists/*


FROM base AS python314

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python-is-python3 \
    python3 \
    python3.14-dev \
    python3.14-venv \
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
    && cp /lib/x86_64-linux-gnu/libdebuginfod*.so* /binutils-libs/ \
    && cp /lib/x86_64-linux-gnu/libopcodes*.so* /binutils-libs/ \
    && cp /lib/x86_64-linux-gnu/libsframe*.so* /binutils-libs/

WORKDIR /binutils

# Patched MIPS binutils
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

# MS-DOS specific
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


FROM python314 AS dependencies

RUN add-apt-repository -y ppa:dosemu2/ppa \
    && add-apt-repository -y ppa:stsp-0/dj64 \
    && apt-get update \
    && apt-get install -y -o APT::Immediate-Configure=false --no-install-recommends \
    cpp \
    curl \
    dj64 \
    dos2unix \
    dosemu2 \
    g++ \
    iptables \
    libc6-dev-i386 \
    libnl-route-3-200 \
    libprotobuf32t64 \
    libtinfo6 \
    wget \
    && rm -rf /var/lib/apt/lists/*

# libtinfo5 is required for older Clang releases.
RUN ARCHIVE=libtinfo5_6.3-2ubuntu0.2_amd64.deb; \
    URL=https://security.ubuntu.com/ubuntu/pool/universe/n/ncurses/$ARCHIVE; \
    SHA256=b9bb64e716a7d9de05b1b33992763142ca81bcae3a7f8ce7e29fa3c6fd32f1e8; \
    wget -O "$ARCHIVE" "$URL" \
    && echo "$SHA256  $ARCHIVE" | sha256sum -c - \
    && apt install "./$ARCHIVE" \
    && rm "$ARCHIVE"

RUN mkdir -p /etc/fonts /sandbox \
    && chown -R ubuntu:ubuntu /sandbox

COPY --from=nsjail /nsjail/nsjail /bin/nsjail
COPY --from=binutils /binutils/ /usr/bin/
COPY --from=binutils /binutils-libs/ /usr/lib/x86_64-linux-gnu/
COPY --from=ghcr.io/decompals/wibo:1.2.0 /usr/local/bin/wibo /usr/bin/

USER ubuntu
WORKDIR /cromper


FROM dependencies AS dev

ARG ENABLE_ANDROID_X86_SUPPORT
ARG ENABLE_DREAMCAST_SUPPORT
ARG ENABLE_GBA_SUPPORT
ARG ENABLE_GC_WII_SUPPORT
ARG ENABLE_MACOSX_SUPPORT
ARG ENABLE_MSDOS_SUPPORT
ARG ENABLE_N3DS_SUPPORT
ARG ENABLE_N64_SUPPORT
ARG ENABLE_NDS_ARM9_SUPPORT
ARG ENABLE_PS1_SUPPORT
ARG ENABLE_PS2_SUPPORT
ARG ENABLE_PSP_SUPPORT
ARG ENABLE_SATURN_SUPPORT
ARG ENABLE_SWITCH_SUPPORT
ARG ENABLE_WIIU_SUPPORT
ARG ENABLE_WIN32_SUPPORT
ARG ENABLE_XBOX360_SUPPORT

ENV ENABLE_ANDROID_X86_SUPPORT=$ENABLE_ANDROID_X86_SUPPORT \
    ENABLE_DREAMCAST_SUPPORT=$ENABLE_DREAMCAST_SUPPORT \
    ENABLE_GBA_SUPPORT=$ENABLE_GBA_SUPPORT \
    ENABLE_GC_WII_SUPPORT=$ENABLE_GC_WII_SUPPORT \
    ENABLE_MACOSX_SUPPORT=$ENABLE_MACOSX_SUPPORT \
    ENABLE_MSDOS_SUPPORT=$ENABLE_MSDOS_SUPPORT \
    ENABLE_N3DS_SUPPORT=$ENABLE_N3DS_SUPPORT \
    ENABLE_N64_SUPPORT=$ENABLE_N64_SUPPORT \
    ENABLE_NDS_ARM9_SUPPORT=$ENABLE_NDS_ARM9_SUPPORT \
    ENABLE_PS1_SUPPORT=$ENABLE_PS1_SUPPORT \
    ENABLE_PS2_SUPPORT=$ENABLE_PS2_SUPPORT \
    ENABLE_PSP_SUPPORT=$ENABLE_PSP_SUPPORT \
    ENABLE_SATURN_SUPPORT=$ENABLE_SATURN_SUPPORT \
    ENABLE_SWITCH_SUPPORT=$ENABLE_SWITCH_SUPPORT \
    ENABLE_WIIU_SUPPORT=$ENABLE_WIIU_SUPPORT \
    ENABLE_WIN32_SUPPORT=$ENABLE_WIN32_SUPPORT \
    ENABLE_XBOX360_SUPPORT=$ENABLE_XBOX360_SUPPORT

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

USER ubuntu

ENTRYPOINT ["/cromper/docker_entrypoint.sh"]


FROM python314 AS uv-install

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

USER ubuntu
WORKDIR /cromper

COPY pyproject.toml uv.lock /cromper/
COPY cromper/ /cromper/cromper/

RUN uv sync --locked --no-dev


FROM dependencies AS prod

COPY --from=uv-install /cromper/.venv /cromper/.venv

COPY --chown=ubuntu:ubuntu pyproject.toml uv.lock /cromper/
COPY --chown=ubuntu:ubuntu compilers/ /cromper/compilers/
COPY --chown=ubuntu:ubuntu libraries/ /cromper/libraries/
COPY --chown=ubuntu:ubuntu cromper/ /cromper/cromper/
COPY --chown=ubuntu:ubuntu docker_entrypoint.sh /cromper/

ENTRYPOINT ["/cromper/docker_entrypoint.sh"]
