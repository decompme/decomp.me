#!/usr/bin/env python3

import argparse
import datetime
import functools
import logging
import os
import platform
import shutil
import tempfile

from pathlib import Path

from multiprocessing import Pool

import docker
import podman

logger = logging.getLogger(__name__)


# TODO: can we pull this out into json/yaml and load based on host arch instead?
if platform.system().lower() == "darwin":
    COMPILERS = {
        "n64": [
            "ido5.3",
            "ido7.1",
            "gcc2.7.2kmc",
            "gcc2.8.1pm",
        ],
        "switch": [
            "clang-4.0.1",
            "clang-8.0.0",
        ],
    }
else:
    COMPILERS = {
        "n64": [
            "gcc2.7.2kmc",
            "gcc2.7.2sn",
            "gcc2.7.2snew",
            "gcc2.8.1pm",
            "gcc2.8.1sn",
            "ido5.3",
            "ido5.3_c++",
            "ido6.0",
            "ido7.1",
            "mips_pro_744",
            "egcs_1.1.2-4",
            "gcc4.4.0-mips64-elf",
        ],
        "ps1": [
            "psyq3.3",
            "psyq3.5",
            "psyq3.6",
            "psyq4.0",
            "psyq4.1",
            "psyq4.3",
            "psyq4.5",
            "psyq4.6",
            "gcc2.6.3-psx",
            "gcc2.6.3-mipsel",
            "gcc2.7.1-mipsel",
            "gcc2.7.2-mipsel",
            "gcc2.7.2.1-mipsel",
            "gcc2.7.2.2-mipsel",
            "gcc2.7.2.3-mipsel",
            "gcc2.8.0-mipsel",
            "gcc2.8.1-mipsel",
            "gcc2.91.66-mipsel",
            "gcc2.95.2-mipsel",
        ],
        "ps2": [
            "ee-gcc2.9-990721",
            "ee-gcc2.9-991111",
            "ee-gcc2.9-991111a",
            "ee-gcc2.9-991111-01",
            "ee-gcc2.95.2-273a",
            "ee-gcc2.95.2-274",
            "ee-gcc2.95.3-107",
            "ee-gcc2.95.3-114",
            "ee-gcc2.95.3-136",
            "ee-gcc2.96",
            "ee-gcc3.2-040921",
            "mwcps2-2.3-991202",
            "mwcps2-3.0b22-011126",
            "mwcps2-3.0b22-020123",
            "mwcps2-3.0b22-020716",
            "mwcps2-3.0b22-020926",
        ],
        "macosx": [
            "gcc-5370",
            "gcc-5026",
            "gcc-5363",
            "gcc3-1041",
        ],
        "gba": [
            "agbcc",
            "agbccpp",
        ],
        "saturn": [
            "cygnus-2.7-96Q3",
        ],
        "switch": [
            "clang-3.9.1",
            "clang-4.0.1",
            "clang-8.0.0",
        ],
        "nds_arm9": [
            "mwcc_20_72",
            "mwcc_20_79",
            "mwcc_20_82",
            "mwcc_20_84",
            "mwcc_20_87",
            "mwcc_30_114",
            "mwcc_30_123",
            "mwcc_30_126",
            "mwcc_30_131",
            "mwcc_30_133",
            "mwcc_30_134",
            "mwcc_30_136",
            "mwcc_30_137",
            "mwcc_30_138",
            "mwcc_30_139",
            "mwcc_40_1018",
            "mwcc_40_1024",
            "mwcc_40_1026",
            "mwcc_40_1027",
            "mwcc_40_1028",
            "mwcc_40_1034",
            "mwcc_40_1036",
            "mwcc_40_1051",
        ],
        "n3ds": [
            "armcc_40_771",
            "armcc_40_821",
            "armcc_41_561",
            "armcc_41_713",
            "armcc_41_791",
            "armcc_41_894",
            "armcc_41_921",
            "armcc_41_1049",
            "armcc_41_1440",
            "armcc_41_1454",
            "armcc_504_82",
        ],
        "gc_wii": [
            "mwcc_233_144",
            "mwcc_233_159",
            "mwcc_233_163",
            "mwcc_233_163n",
            "mwcc_242_81",
            "mwcc_247_92",
            "mwcc_247_105",
            "mwcc_247_107",
            "mwcc_247_108",
            "mwcc_41_60831",
            "mwcc_41_60126",
            "mwcc_42_142",
            "mwcc_43_151",
            "mwcc_43_172",
            "mwcc_43_213",
            "mwcc_242_81r",
            "mwcc_233_163e",
            "mwcc_42_127",
        ],
        "msdos": [
            "wcc10.5",
            "wcc10.5a",
            "wcc10.6",
            "wcc11.0",
        ],
        "win9x": [
            "msvc6.0",
            "msvc6.3",
            "msvc6.4",
            "msvc6.5",
            "msvc6.5pp",
            "msvc6.6",
            "msvc7.0",
            "msvc7.1",
            "msvc4.0",
            "msvc4.2",
        ],
    }


class ContainerManager:
    def pull(self, docker_image):
        return self.client.images.pull(docker_image)

    def create_container(self, docker_image, commands=None):
        if commands is None:
            commands = [""]
        if not isinstance(commands, list):
            commands = [commands]
        return self.client.containers.create(docker_image, command=commands)


class PodmanManager(ContainerManager):
    def __init__(self, uri="unix:///tmp/podman.sock"):
        self.client = podman.PodmanClient(base_url=uri)
        # sanity check that service is up and running
        try:
            self.client.images.list()
        except FileNotFoundError:
            raise Exception("%s not found, is the podman service running?")
        except podman.errors.exceptions.APIError as err:
            logger.error("Podman error: %s, will try to continue", err)

    def get_remote_image_digest(self, docker_image, os="linux"):
        # this is the arch-specific sha256
        try:
            manifest = self.client.manifests.get(docker_image)
        except podman.errors.exceptions.NotFound:
            return None
        os_digest = list(
            filter(lambda x: x["platform"]["os"] == os, manifest.attrs["manifests"])
        )
        digest = os_digest[0]["digest"]
        return digest

    def get_local_image_digest(self, docker_image):
        local_tags = []
        for image in self.client.images.list():
            local_tags += image.tags
        if docker_image in local_tags:
            image = self.client.images.get(docker_image)
            # NOTE: image.attrs["Digest"] is the overall sha256 of a multi-arch image
            #       but we cannot get the equivalent from the registry using podman's API.
            rd = image.manager.get_registry_data(docker_image)
            digest = rd.attrs["RepoDigests"][-1]
            return digest.split("@")[-1]

        return None


class DockerManager(ContainerManager):
    def __init__(self):
        self.client = docker.from_env()

    def get_remote_image_digest(self, docker_image):
        try:
            # this is the overall sha256 of a multi-arch image
            image = self.client.api.inspect_distribution(docker_image)
        except docker.errors.APIError:
            return None
        digest = image["Descriptor"]["digest"]
        return digest

    def get_local_image_digest(self, docker_image):
        try:
            image = self.client.api.inspect_image(docker_image)
        except docker.errors.ImageNotFound:
            return None
        # TODO: confirm assumption that last one is the right one
        digest = image["RepoDigests"][-1]
        return digest.split("@")[-1]


def get_compiler(
    platform_id,
    compiler_id,
    compilers_dir="/tmp",
    force=False,
    podman=False,
    docker_registry="ghcr.io/mkst/compilers",
):
    logger.info("Processing %s (%s)", compiler_id, platform_id)

    # fast-fail if we cannot create the download_cache
    download_cache = compilers_dir / ".download_cache"
    download_cache.mkdir(parents=True, exist_ok=True)

    # TODO: podman seems to have issues sharing a single instance
    client_manager = PodmanManager() if podman else DockerManager()

    clean_compiler_id = compiler_id.lower().replace("+", "plus")
    docker_image = f"{docker_registry}/{platform_id}/{clean_compiler_id}:latest"

    logger.debug(f"Checking for %s in registry", docker_image)
    remote_image_digest = client_manager.get_remote_image_digest(docker_image)
    if remote_image_digest is None:
        host_arch = platform.system().lower()
        logger.debug(
            f"%s not found in registry, checking for '%s' specific version",
            docker_image,
            host_arch,
        )
        docker_image = (
            f"{docker_registry}/{platform_id}/{clean_compiler_id}/{host_arch}:latest"
        )
        remote_image_digest = client_manager.get_remote_image_digest(docker_image)
        if remote_image_digest is None:
            logger.error(f"%s not found in registry!", docker_image)
            return

    compiler_dir = compilers_dir / platform_id / compiler_id
    image_digest = compiler_dir / ".image_digest"

    if not compiler_dir.exists() or force is True:
        # we need to extract something, check if we need to pull the image
        if client_manager.get_local_image_digest(docker_image) != remote_image_digest:
            logger.info("%s has newer image available; pulling ...", docker_image)
            client_manager.pull(docker_image)
        else:
            logger.info(
                f"%s (%s) image is present and at latest version, continuing!",
                compiler_id,
                platform_id,
            )
    else:
        # compiler_dir exists, is it up to date with remote?
        if image_digest.exists() and image_digest.read_text() == remote_image_digest:
            logger.info(
                f"%s image is present and at latest version, skipping!", compiler_id
            )
            return
        # image_digest missing or out of date, so pull
        logger.info("%s has newer image available; pulling ...", docker_image)
        client_manager.pull(docker_image)

    try:
        container = client_manager.create_container(docker_image)
    except Exception as err:
        logger.error("Unable to create container for %s: %s", docker_image, err)
        return

    try:
        compiler_container_path = f"/compilers/{platform_id}/{compiler_id}"
        stream, _ = container.get_archive(compiler_container_path)
    except Exception as err:
        logger.error(
            "Unable to pull '%s' from container: %s", compiler_container_path, err
        )
        container.remove()
        return

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            tar_file = Path(temp_dir) / f"{platform_id}_{compiler_id}.tar"
            logger.debug("Writing to %s...", tar_file)
            with tar_file.open("wb") as f:
                for chunk in stream:
                    f.write(chunk)

            logger.debug(f"Extracting %s to %s", tar_file, download_cache)
            shutil.unpack_archive(tar_file, download_cache)

            if compiler_dir.exists():
                logger.debug("Removing existing compiler dir: %s", compiler_dir)
                shutil.rmtree(compiler_dir)

            logger.debug(
                f"shutil.move %s -> %s", download_cache / compiler_id, compiler_dir
            )
            shutil.move(str(download_cache / compiler_id), str(compiler_dir))

            image_digest.write_text(remote_image_digest)

            logger.info(
                "%s (%s) was successfully downloaded into %s",
                compiler_id,
                platform_id,
                compiler_dir,
            )
    except Exception as err:
        logger.error(err)
        container.remove()
        return False

    container.remove()
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--podman", action="store_true", help="Use podman instead of docker"
    )
    parser.add_argument(
        "--force",
        help="Force (re)downloading of compilers",
        action="store_true",
    )
    parser.add_argument(
        "--compilers-dir",
        type=str,
        default=None,
        help="Directory where compilers will be stored",
    )
    parser.add_argument(
        "--platforms", type=str, nargs="+", help="Only run for these platforms"
    )
    parser.add_argument(
        "--compilers", type=str, nargs="+", help="Only run for these compilers"
    )
    parser.add_argument(
        "--docker-registry",
        type=str,
        default="ghcr.io/mkst/compilers",
        help="Docker registry where the packages live",
    )
    parser.add_argument(
        "--threads", type=int, default=4, help="Number of download threads to use"
    )
    parser.add_argument("--verbose", action="store_true", help="Enable DEBUG log level")
    args = parser.parse_args()

    if args.verbose:
        logger.setLevel("DEBUG")

    if args.compilers_dir:
        compilers_dir: Path = Path(args.compilers_dir)
    else:
        compilers_dir: Path = Path(os.path.dirname(os.path.realpath(__file__)))

    to_download = []
    for platform_id, compilers in COMPILERS.items():
        if args.platforms is not None:
            platform_enabled = platform_id in args.platforms
        else:
            # platforms are considered enabled unless explicitly disabled
            platform_enabled = (
                os.environ.get(f"ENABLE_{platform_id.upper()}_SUPPORT", "YES").upper()
                != "NO"
            )
        if args.compilers is not None:
            compilers = filter(lambda x: x in args.compilers, compilers)

        if platform_enabled:
            to_download += [(platform_id, compiler) for compiler in compilers]

    if len(to_download) == 0:
        logger.warning(
            "No platforms/compilers configured or enabled for host architecture (%s)",
            platform.system().lower(),
        )
        return

    start = datetime.datetime.now()
    with Pool(processes=args.threads) as pool:
        results = pool.starmap(
            functools.partial(
                get_compiler,
                compilers_dir=compilers_dir,
                podman=args.podman,
                force=args.force,
                docker_registry=args.docker_registry,
            ),
            to_download,
        )
    end = datetime.datetime.now()

    compilers_downloaded = len(list(filter(lambda x: x, results)))
    logger.info(
        "Updated %i / %i compiler(s) in %.2f second(s)",
        compilers_downloaded,
        len(to_download),
        (end - start).total_seconds(),
    )


if __name__ == "__main__":
    logging.basicConfig(
        handlers=[logging.StreamHandler()],
        level=logging.INFO,
        format=("%(asctime)s.%(msecs)03d %(levelname)s %(funcName)s %(message)s"),
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    main()
