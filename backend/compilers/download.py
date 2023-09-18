#!/usr/bin/env python3

import argparse
import datetime
import functools
import logging
import os
import platform
import shutil
import sys
import tempfile

from pathlib import Path

from multiprocessing import Pool

import requests
import yaml
import docker
import podman

logger = logging.getLogger(__name__)


class ContainerManager:
    def pull(self, docker_image):
        return self.client.images.pull(docker_image)

    def create_container(self, docker_image, commands=None):
        if commands is None:
            commands = [""]
        if not isinstance(commands, list):
            commands = [commands]
        return self.client.containers.create(docker_image, command=commands)

    def get_remote_image_digest(
        self,
        docker_image,
        docker_registry="ghcr.io",
        github_repo="mkst/compilers",
        tag="latest",
    ):
        token_url = f"https://{docker_registry}/token?scope=repository:{github_repo}/{docker_image}:pull"
        resp = requests.get(token_url, timeout=10)
        if resp.status_code != 200:
            # hopefully the image does not exist in remote registry
            return None
        token = resp.json().get("token", "")

        image_url = (
            f"https://{docker_registry}/v2/{github_repo}/{docker_image}/manifests/{tag}"
        )
        headers = {
            "Accept": "application/vnd.oci.image.index.v1+json",
            "Authorization": f"Bearer {token}",
        }
        resp = requests.get(image_url, headers=headers, timeout=10)
        if resp.status_code != 200:
            logger.error(
                "Unable to get image manifest for %s from %s: %s",
                docker_image,
                github_repo,
                resp.text,
            )
            return None

        digest = resp.headers.get("docker-content-digest")
        return digest


class PodmanManager(ContainerManager):
    def __init__(self, uri="unix:///tmp/podman.sock"):
        self.client = podman.PodmanClient(base_url=uri)
        try:
            # sanity check that the podman service is up and running
            self.client.ping()
        except FileNotFoundError:
            raise Exception("%s not found, is the podman service running?", uri)
        except podman.errors.exceptions.APIError:
            raise Exception("%s found, is the podman service running?", uri)

    def get_local_image_digest(self, docker_image):
        try:
            image = self.client.images.get(docker_image)
        except podman.errors.exceptions.ImageNotFound:
            return None
        return image.attrs["Digest"]


class DockerManager(ContainerManager):
    def __init__(self):
        try:
            self.client = docker.from_env()
        except FileNotFoundError:
            raise Exception(
                "%s not found, is the docker service running?", "/var/run/docker.sock"
            )
        except docker.errors.DockerException:
            raise Exception(
                "%s found, is the docker service running?", "/var/run/docker.sock"
            )

    def get_local_image_digest(self, docker_image):
        try:
            image = self.client.api.inspect_image(docker_image)
        except docker.errors.ImageNotFound:
            return None
        # TODO: confirm assumption that we are only getting 1 digest back...
        digest = image["RepoDigests"][-1]
        return digest.split("@")[-1]


def get_compiler(
    platform_id,
    compiler_id,
    compilers_dir="/tmp",
    force=False,
    use_podman=False,
    docker_registry="ghcr.io",
    github_repo="mkst/compilers",
    tag="latest",
):
    logger.info("Processing %s (%s)", compiler_id, platform_id)

    # fast-fail if we cannot create the download_cache
    download_cache = compilers_dir / ".download_cache"
    download_cache.mkdir(parents=True, exist_ok=True)

    # TODO: podman seems to have issues sharing a single instance
    client_manager = PodmanManager() if use_podman else DockerManager()

    clean_compiler_id = compiler_id.lower().replace("+", "plus")
    docker_image = f"{platform_id}/{clean_compiler_id}"

    logger.debug("Checking for %s in registry", docker_image)
    remote_image_digest = client_manager.get_remote_image_digest(
        docker_image, docker_registry=docker_registry, github_repo=github_repo, tag=tag
    )
    if remote_image_digest is None:
        host_arch = platform.system().lower()
        logger.debug(
            "%s not found in registry, checking for '%s' specific version",
            docker_image,
            host_arch,
        )
        docker_image = f"{platform_id}/{clean_compiler_id}/{host_arch}"
        remote_image_digest = client_manager.get_remote_image_digest(
            docker_image,
            docker_registry=docker_registry,
            github_repo=github_repo,
            tag=tag,
        )
        if remote_image_digest is None:
            logger.error("%s not found in registry!", docker_image)
            return

    full_docker_image = f"{docker_registry}/{github_repo}/{docker_image}:{tag}"

    compiler_dir = compilers_dir / platform_id / compiler_id
    image_digest = compiler_dir / ".image_digest"

    if not compiler_dir.exists() or force is True:
        # we need to extract something, check if we need to pull the image
        if (
            client_manager.get_local_image_digest(full_docker_image)
            != remote_image_digest
        ):
            logger.debug("%s has newer image available; pulling ...", full_docker_image)
            client_manager.pull(full_docker_image)
        else:
            logger.debug(
                "%s (%s) image is present and at latest version, continuing!",
                compiler_id,
                platform_id,
            )
    else:
        # compiler_dir exists, is it up to date with remote?
        if image_digest.exists() and image_digest.read_text() == remote_image_digest:
            logger.debug(
                "%s image is present and at latest version, skipping!", compiler_id
            )
            return
        # image_digest missing or out of date, so pull
        logger.debug("%s has newer image available; pulling ...", full_docker_image)
        client_manager.pull(full_docker_image)

    try:
        container = client_manager.create_container(full_docker_image)
    except Exception as err:
        logger.error("Unable to create container for %s: %s", full_docker_image, err)
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

            logger.debug("Extracting %s to %s", tar_file, download_cache)
            shutil.unpack_archive(tar_file, download_cache)

            if compiler_dir.exists():
                logger.debug("Removing existing compiler dir: %s", compiler_dir)
                shutil.rmtree(compiler_dir)

            logger.debug(
                "shutil.move %s -> %s", download_cache / compiler_id, compiler_dir
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
        "--use-podman",
        "--podman",
        action="store_true",
        help="Use podman instead of docker",
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
        default="ghcr.io",
        help="Docker registry where the packages live",
    )
    parser.add_argument(
        "--github-repo",
        type=str,
        default="mkst/compilers",
        help="Name of github repo that owns the packages",
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

    host_arch = platform.system().lower()
    if host_arch not in ["darwin", "linux"]:
        logger.fatal(
            "No compiler configuration is available for '%s' architecture, exiting",
            host_arch,
        )
        sys.exit(0)

    to_download = []

    compilers_yaml = (
        Path(os.path.dirname(os.path.realpath(__file__)))
        / f"compilers.{host_arch}.yaml"
    )
    compilers_config = yaml.safe_load(compilers_yaml.open())

    for platform_id, compilers in compilers_config.items():
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
            host_arch,
        )
        return

    start = datetime.datetime.now()
    with Pool(processes=args.threads) as pool:
        results = pool.starmap(
            functools.partial(
                get_compiler,
                compilers_dir=compilers_dir,
                use_podman=args.use_podman,
                force=args.force,
                docker_registry=args.docker_registry,
                github_repo=args.github_repo,
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
