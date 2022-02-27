import argparse
import os
import platform
import shutil
import stat
import sys
import tarfile
from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from zipfile import ZipFile

import requests
from tqdm import tqdm


@dataclass
class OS:
    name: str
    system: str
    clang_package_name: str
    n64_gcc_os: str
    ido_os: str


MACOS = OS(
    name="MacOS",
    system="darwin",
    clang_package_name="apple-darwin",
    n64_gcc_os="mac",
    ido_os="macos",
)
LINUX = OS(
    name="Linux",
    system="linux",
    clang_package_name="linux-gnu-debian8",
    n64_gcc_os="linux",
    ido_os="ubuntu",
)

oses: dict[str, OS] = {
    "darwin": MACOS,
    "linux": LINUX,
}

os_str = platform.system().lower()
if os_str not in oses:
    print(f"Unsupported host os: {os_str}")
    sys.exit(1)

host_os: OS = oses[os_str]

COMPILERS_DIR: Path = Path(os.path.dirname(os.path.realpath(__file__)))
DOWNLOAD_CACHE = COMPILERS_DIR / "download_cache"
DOWNLOAD_CACHE.mkdir(exist_ok=True)

# Downloads a file to the file cache
def download_file(url: str, log_name: str, dest_path: Path) -> Optional[Path]:
    if dest_path.exists():
        print(f"Download of {log_name} already exists; skipping download")
        return

    response = requests.get(url, stream=True)
    total_size_in_bytes = int(response.headers.get("content-length", 0))
    block_size = 1024
    progress_bar = tqdm(
        desc=f"Downloading {log_name}",
        total=total_size_in_bytes,
        unit="B",
        unit_scale=True,
    )

    with open(dest_path, "wb") as f:
        for data in response.iter_content(block_size):
            progress_bar.update(len(data))
            f.write(data)

    progress_bar.close()

    if (
        total_size_in_bytes != 0
        and progress_bar.n != total_size_in_bytes
        and total_size_in_bytes > 1024 * 1024
    ):
        print("ERROR, something went wrong")


# Used for compiler packages
def download_file_wrapper(
    url: str, dl_name: str, dest_name: str, create_subdir: bool, log_name: str
):
    download_file(url=url, log_name=log_name, dest_path=DOWNLOAD_CACHE / dl_name)

    if create_subdir:
        dest_path = COMPILERS_DIR / dest_name
        dest_path.mkdir(exist_ok=True)
    else:
        dest_path = COMPILERS_DIR

    return dest_path


def download_tar(
    url: str,
    mode: str = "r:gz",
    dl_name: str = "",
    dest_name: str = "",
    create_subdir: bool = True,
    log_name: str = "",
):
    if not dl_name:
        if dest_name:
            dl_name = dest_name
        else:
            dl_name = url.split("/")[-1]

    if not dest_name:
        dest_name = dl_name

    if not log_name:
        log_name = dest_name

    dest_path = download_file_wrapper(url, dl_name, dest_name, create_subdir, log_name)

    with tarfile.open(DOWNLOAD_CACHE / dl_name, mode=mode) as f:
        for member in tqdm(
            desc=f"Extracting {log_name}",
            iterable=f.getmembers(),
            total=len(f.getmembers()),
        ):
            f.extract(member=member, path=dest_path)


def download_zip(
    url: str,
    dl_name: str = "",
    dest_name: str = "",
    create_subdir: bool = False,
    log_name: str = "",
):
    if not dl_name:
        if dest_name:
            dl_name = dest_name
        else:
            dl_name = url.split("/")[-1]

    if not dest_name:
        dest_name = dl_name

    if not log_name:
        log_name = dest_name

    dest_path = download_file_wrapper(url, dl_name, dest_name, create_subdir, log_name)

    with ZipFile(file=DOWNLOAD_CACHE / dl_name) as f:
        for file in tqdm(
            desc=f"Extracting {log_name}",
            iterable=f.namelist(),
            total=len(f.namelist()),
        ):
            f.extract(member=file, path=dest_path)


def download_gba():
    if host_os != LINUX:
        print("agbcc unsupported on " + host_os.name)
        return

    def download_agbcc(url: str, dest: str):
        dest_dir = COMPILERS_DIR / dest
        if dest_dir.exists():
            print(f"{dest} already exists, skipping")
            return

        download_tar(url=url, dest_name=dest)

    download_agbcc(
        "https://github.com/ethteck/agbcc/releases/download/master/agbcc.tar.gz",
        "agbcc",
    )
    download_agbcc(
        "https://github.com/notyourav/agbcc/releases/download/cp/agbcc.tar.gz",
        "agbccpp",
    )


def download_switch():
    def dest_for_version(version: str) -> Path:
        return COMPILERS_DIR / f"clang-{version}"

    versions = ["4.0.1", "3.9.1"]

    # 3.9.1 isn't available for mac
    mac_versions = versions.copy()
    mac_versions.remove("3.9.1")

    botw_lib_musl_versions = ["4.0.1", "3.9.1"]

    # Download and extract the compilers
    for version in versions:
        if host_os == MACOS and version not in mac_versions:
            continue

        log_name = f"clang {version}"
        dest_dir = dest_for_version(version)
        if dest_dir.exists():
            print(f"{log_name} already exists, skipping")
            continue

        package_name = f"clang+llvm-{version}-x86_64-{host_os.clang_package_name}"
        url = f"https://releases.llvm.org/{version}/{package_name}.tar.xz"

        download_tar(url=url, mode="r:xz", log_name=log_name, create_subdir=False)

        shutil.move(COMPILERS_DIR / package_name, dest_dir)

        # 3.9.1 requires ld.lld and doesn't have it, so we copy it from 4.0.1
        if version == "3.9.1":
            shutil.copy(
                dest_for_version("4.0.1") / "bin/ld.lld", dest_dir / "bin/ld.lld"
            )

    # Set up musl
    download_zip(
        url="https://github.com/open-ead/botw-lib-musl/archive/25ed8669943bee65a650700d340e451eda2a26ba.zip",
        log_name="musl",
    )
    musl_name = "botw-lib-musl-25ed8669943bee65a650700d340e451eda2a26ba"
    musl_dest = COMPILERS_DIR / musl_name
    for version in botw_lib_musl_versions:
        ver_dest = dest_for_version(version)
        if ver_dest.exists():
            shutil.copytree(musl_dest, ver_dest / musl_name, dirs_exist_ok=True)
    shutil.rmtree(musl_dest)


def download_n64():
    def download_gcc(gcc_url: str, binutils_url, dest: str):
        dest_path = COMPILERS_DIR / dest
        if dest_path.exists():
            print(f"{dest} already exists, skipping")
        else:
            download_tar(
                url=gcc_url,
                dest_name=dest,
            )
            download_tar(
                url=binutils_url,
                dl_name=f"{dest}-binutils",
                dest_name=dest,
            )

    # GCC 2.8.1
    download_gcc(
        gcc_url=f"https://github.com/pmret/gcc-papermario/releases/download/master/{host_os.n64_gcc_os}.tar.gz",
        binutils_url=f"https://github.com/pmret/binutils-papermario/releases/download/master/{host_os.n64_gcc_os}.tar.gz",
        dest="gcc2.8.1",
    )

    # GCC 2.7.2 KMC
    download_gcc(
        gcc_url=f"https://github.com/decompals/mips-gcc-2.7.2/releases/download/main/gcc-2.7.2-{host_os.n64_gcc_os}.tar.gz",
        binutils_url=f"https://github.com/decompals/mips-binutils-2.6/releases/download/main/binutils-2.6-{host_os.n64_gcc_os}.tar.gz",
        dest="gcc2.7.2kmc",
    )

    # IDO
    ido_versions = ["5.3", "7.1"]
    for version in ido_versions:
        dest = COMPILERS_DIR / f"ido{version}"
        if dest.exists():
            print(f"ido{version} already exists, skipping")
        else:
            download_tar(
                url=f"https://github.com/ethteck/ido-static-recomp/releases/download/master/ido-{version}-recomp-{host_os.ido_os}-latest.tar.gz",
                dest_name=f"ido{version}",
            )
    pass


def download_ps1():
    if host_os != LINUX:
        print("ps1 compilers unsupported on " + host_os.name)
        return

    download_zip(
        url="https://github.com/decompals/old-gcc/releases/download/release/gcc-2.6.3.zip",
        dl_name="gcc2.6.3-mispel.zip",
        dest_name="gcc2.6.3-mispel",
        create_subdir=True,
    )

    download_tar(
        url="https://github.com/mkst/esa/releases/download/psyq-binaries/psyq-compilers.tar.gz",
        dest_name="psyq-compilers",
    )

    psyq_to_gcc = {
        "4.0": "2.7.2",
        "4.1": "2.7.2",
        "4.3": "2.8.1",
        "4.6": "2.95.2",
    }

    for version in psyq_to_gcc.keys():
        compilers_path = COMPILERS_DIR / "psyq-compilers"
        dest = COMPILERS_DIR / f"psyq{version}"
        if not dest.exists():
            shutil.move(compilers_path / f"psyq{version}", COMPILERS_DIR)
        shutil.copy(
            compilers_path / "psyq-obj-parser",
            dest / "psyq-obj-parser",
        )

        # +x exes
        for file in dest.glob("*.exe"):
            file.chmod(file.stat().st_mode | stat.S_IEXEC)
        for file in dest.glob("*.EXE"):
            file.chmod(file.stat().st_mode | stat.S_IEXEC)

    shutil.rmtree(compilers_path)

    binutils_name = "binutils-2.25.1-psyq"
    download_tar(
        "https://github.com/mkst/esa/releases/download/binutils-2.251/binutils-2.25.1.tar.gz",
        dest_name=binutils_name,
        create_subdir=True,
    )
    as_path = COMPILERS_DIR / binutils_name / "usr" / "local" / "bin" / "mips-elf-as"

    # psyq flavours of gcc
    for pysq_ver, gcc_ver in psyq_to_gcc.items():
        dest = COMPILERS_DIR / f"gcc{gcc_ver}-psyq"
        dest.mkdir(exist_ok=True)
        exe_name = "CC1PSX.EXE"
        shutil.copy(COMPILERS_DIR / f"psyq{pysq_ver}" / exe_name, dest / exe_name)
        shutil.copy(as_path, dest / "mips-elf-as")

        # +x exes
        for file in dest.glob("*.EXE"):
            file.chmod(file.stat().st_mode | stat.S_IEXEC)

    shutil.rmtree(COMPILERS_DIR / binutils_name)


def download_nds():
    compiler_groups = {
        "1.2": {
            "base": "mwcc_20_72",
            "sp2": "mwcc_20_79",
            "sp2p3": "mwcc_20_82",
            "sp3": "mwcc_20_84",
            "sp4": "mwcc_20_87",
        },
        "2.0": {
            "base": "mwcc_30_114",
            "sp1": "mwcc_30_123",
            "sp1p2": "mwcc_30_126",
            "sp1p5": "mwcc_30_131",
            "sp1p6": "mwcc_30_133",
            "sp1p7": "mwcc_30_134",
            "sp2": "mwcc_30_136",
            "sp2p2": "mwcc_30_137",
            "sp2p3": "mwcc_30_138",
            "sp2p4": "mwcc_30_139",
        },
        "dsi": {
            "1.1": "mwcc_40_1018",
            "1.1p1": "mwcc_40_1024",
            "1.2": "mwcc_40_1026",
            "1.2p1": "mwcc_40_1027",
            "1.2p2": "mwcc_40_1028",
            "1.3": "mwcc_40_1034",
            "1.3p1": "mwcc_40_1036",
            "1.6sp1": "mwcc_40_1051",
        },
    }

    download_zip(
        url="https://cdn.discordapp.com/attachments/698589325620936736/845499146982129684/mwccarm.zip",
    )

    # Organize dirs, copy license
    for group_id, group in compiler_groups.items():
        mwccarm_dir = COMPILERS_DIR / "mwccarm" / group_id
        license_path = COMPILERS_DIR / "mwccarm" / "license.dat"
        for ver, compiler_id in group.items():
            compiler_dir = COMPILERS_DIR / compiler_id
            if not compiler_dir.exists():
                shutil.move(mwccarm_dir / ver, compiler_dir)

            shutil.copy(license_path, compiler_dir / "license.dat")

            # Set +x to allow WSL without wine
            exe_path = compiler_dir / "mwccarm.exe"
            exe_path.chmod(exe_path.stat().st_mode | stat.S_IEXEC)

    shutil.rmtree(COMPILERS_DIR / "mwccarm")


def download_wii_gc():
    compiler_groups = {
        "GC": {
            "1.0": "mwcc_233_144",
            "1.1": "mwcc_233_159",
            "1.2.5": "mwcc_233_163",
            "1.2.5e": "mwcc_233_163e",
            "1.3.2": "mwcc_242_81",
            "2.0": "mwcc_247_92",
            "2.5": "mwcc_247_105",
            "2.6": "mwcc_247_107",
            "2.7": "mwcc_247_108",
            "3.0": "mwcc_41_60831",
            "3.0a3": "mwcc_41_60126",
        },
        "Wii": {
            "1.0": "mwcc_42_142",
            "1.1": "mwcc_43_151",
            "1.3": "mwcc_43_172",
            "1.7": "mwcc_43_213",
        },
    }

    download_zip(
        url="https://cdn.discordapp.com/attachments/727918646525165659/917185027656286218/GC_WII_COMPILERS.zip",
    )

    for group_id, group in compiler_groups.items():
        for ver, compiler_id in group.items():
            compiler_dir = COMPILERS_DIR / compiler_id
            if not compiler_dir.exists():
                shutil.move(COMPILERS_DIR / group_id / ver, compiler_dir)

            # Rename dll to uppercase - WSL is case sensitive without wine
            lowercase_lmgr = compiler_dir / "lmgr326b.dll"
            if lowercase_lmgr.exists():
                shutil.move(lowercase_lmgr, compiler_dir / "LMGR326B.dll")

            # Set +x to allow WSL without wine
            exe_path = compiler_dir / "mwcceppc.exe"
            exe_path.chmod(exe_path.stat().st_mode | stat.S_IEXEC)

        shutil.rmtree(COMPILERS_DIR / group_id)

    # copy in clean 1.2.5 for frank
    shutil.copy(
        COMPILERS_DIR / "mwcc_233_163" / "mwcceppc.exe",
        COMPILERS_DIR / "mwcc_233_163e" / "mwcceppc.125.exe",
    )
    download_file(
        url="https://raw.githubusercontent.com/projectPiki/pikmin/main/tools/frank.py",
        log_name="frank",
        dest_path=COMPILERS_DIR / "mwcc_233_163e" / "frank.py",
    )


# TODO migration for tp version of wii_gc compiler to the non-tp version
# TODO MIGRATION FROM gcc2.7kmc to gcc2.7.2kmc (+ config)
def main(args):
    download_gba()
    download_switch()
    download_n64()
    download_ps1()
    download_nds()
    download_wii_gc()
    print("Compilers finished downloading!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download decomp.me compilers")
    main(parser.parse_args())
