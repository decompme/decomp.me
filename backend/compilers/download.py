#!/usr/bin/env python3

import argparse
import datetime
import logging
import os
import platform
import queue
import shutil
import sys
import tempfile
import threading

from pathlib import Path

import requests
import yaml


logger = logging.getLogger(__name__)


def get_token(docker_registry, github_repo, docker_image, session=None):
    token_url = f"https://{docker_registry}/token?scope=repository:{github_repo}/{docker_image}:pull"
    getter = requests if session is None else session
    resp = getter.get(token_url, timeout=10)
    if resp.status_code != 200:
        # hopefully the image does not exist in remote registry
        return None
    return resp.json().get("token", "")


def get_remote_image_digest(
    docker_image,
    docker_registry="ghcr.io",
    github_repo="decompme/compilers",
    tag="latest",
    session=None,
):
    token = get_token(docker_registry, github_repo, docker_image)

    image_url = (
        f"https://{docker_registry}/v2/{github_repo}/{docker_image}/manifests/{tag}"
    )
    headers = {
        "Accept": "application/vnd.oci.image.index.v1+json",
        "Authorization": f"Bearer {token}",
    }
    getter = requests if session is None else session
    resp = getter.get(image_url, headers=headers, timeout=10)
    if resp.status_code != 200:
        logger.debug(
            "Unable to get image manifest for %s:%s from %s: %s",
            docker_image,
            tag,
            github_repo,
            resp.text,
        )
        return None

    digest = resp.headers.get("docker-content-digest")
    return digest


def get_compiler_raw(
    platform_id,
    compiler_id,
    compilers_dir="/tmp",
    force=False,
    docker_registry="ghcr.io",
    github_repo="decompme/compilers",
    tag="latest",
    session=None,
):
    logger.info("Processing %s (%s)", compiler_id, platform_id)

    # fast-fail if we cannot create the download_cache
    download_cache = compilers_dir / ".download_cache"
    download_cache.mkdir(parents=True, exist_ok=True)

    clean_compiler_id = compiler_id.lower().replace("+", "plus")
    docker_image = f"{platform_id}/{clean_compiler_id}"

    logger.debug("Checking for %s in registry", docker_image)
    remote_image_digest = get_remote_image_digest(
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
        remote_image_digest = get_remote_image_digest(
            docker_image,
            docker_registry=docker_registry,
            github_repo=github_repo,
            tag=tag,
        )
        if remote_image_digest is None:
            logger.error("%s not found in registry!", docker_image)
            return None

    compiler_dir = compilers_dir / platform_id / compiler_id
    image_digest = compiler_dir / ".image_digest"

    if (
        image_digest.exists()
        and image_digest.read_text() == remote_image_digest
        and not force
    ):
        logger.debug(
            "%s image is present and at latest version, skipping!", compiler_id
        )
        return None

    # First, get a token to do our operations with
    token = get_token(docker_registry, github_repo, docker_image)

    # Then, get the container image index. This will give us all the
    # container images associated with this tag. There may be different
    # images for different OSes/platforms. In our case, we only expect one
    # though.
    image_url = (
        f"https://{docker_registry}/v2/{github_repo}/{docker_image}/manifests/{tag}"
    )
    headers = {
        "Accept": "application/vnd.oci.image.index.v1+json",
        "Authorization": f"Bearer {token}",
    }
    getter = requests if session is None else session
    resp = getter.get(image_url, headers=headers, timeout=10)
    if resp.status_code != 200:
        return None
    data = resp.json()

    # Grab the first image manifest, and download it.
    manifest = next(
        (
            manifest
            for manifest in data["manifests"]
            if manifest["mediaType"] == "application/vnd.oci.image.manifest.v1+json"
        )
    )
    digest = manifest["digest"]
    mime = manifest["mediaType"]
    headers["Accept"] = mime
    url = (
        f"https://{docker_registry}/v2/{github_repo}/{docker_image}/manifests/{digest}"
    )
    resp = getter.get(url, headers=headers, timeout=10)
    if resp.status_code != 200:
        return None
    data = resp.json()

    with tempfile.TemporaryDirectory() as temp_dir:
        # Then, download all the layers
        for layer_num, layer in enumerate(data["layers"]):
            digest = layer["digest"]
            mime = layer["mediaType"]
            url = f"https://{docker_registry}/v2/{github_repo}/{docker_image}/blobs/{digest}"

            resp = getter.get(url, headers=headers, stream=True)
            resp.raise_for_status()

            # TODO: Get extension from mime
            tar_file = (
                Path(temp_dir) / f"{platform_id}_{compiler_id}_{layer_num}.tar.gz"
            )

            logger.debug("Writing layer %s (%s) to %s...", layer_num, digest, tar_file)
            with tar_file.open("wb") as f:
                for chunk in resp.iter_content(chunk_size=10 * 1024 * 1024):
                    f.write(chunk)

        # Extract all the layers
        for layer_num, layer in enumerate(data["layers"]):
            tar_file = (
                Path(temp_dir) / f"{platform_id}_{compiler_id}_{layer_num}.tar.gz"
            )
            logger.debug("Extracting layer %s to %s", tar_file, download_cache)
            shutil.unpack_archive(tar_file, download_cache)

        # And finally, move the compiler_container_path (the prefix where the
        # compiler is stored in the docker archive) to the final destination.
        compiler_container_path = f"compilers/{platform_id}/{compiler_id}"

        compiler_download_cache = download_cache / compiler_container_path
        if not compiler_download_cache.exists():
            logger.error("Extracting failed to create %s", compiler_download_cache)
            return False

        if compiler_dir.exists():
            logger.debug("Removing existing compiler dir: %s", compiler_dir)
            shutil.rmtree(compiler_dir)

        logger.debug("shutil.move %s -> %s", compiler_download_cache, compiler_dir)
        shutil.move(str(compiler_download_cache), str(compiler_dir))

        image_digest.write_text(remote_image_digest)

        logger.info(
            "%s (%s) was successfully downloaded into %s",
            compiler_id,
            platform_id,
            compiler_dir,
        )
        return True


class DownloadThread(threading.Thread):
    def __init__(
        self,
        download_queue: queue.Queue,
        results_queue: queue.Queue,
        *args,
        compilers_dir=Path("/tmp"),
        force=False,
        docker_registry="ghcr.io",
        github_repo="decompme/compilers",
        **kwargs,
    ):
        self.download_queue = download_queue
        self.results_queue = results_queue

        self.compilers_dir = compilers_dir
        self.force = force
        self.docker_registry = docker_registry
        self.github_repo = github_repo

        self.session = requests.Session()

        super().__init__(*args, **kwargs)

    def run(self):
        while True:
            try:
                try:
                    item = self.download_queue.get_nowait()
                except queue.Empty:
                    break
                self.process_item(item)
                self.download_queue.task_done()
            except Exception as e:
                logger.error("Exception thrown while processing item: %s", e)
                break

    def process_item(self, item):
        platform_id, compiler_id = item

        result = get_compiler_raw(
            platform_id,
            compiler_id,
            compilers_dir=self.compilers_dir,
            force=self.force,
            docker_registry=self.docker_registry,
            github_repo=self.github_repo,
            session=self.session,
        )

        self.results_queue.put(result)


def main():
    parser = argparse.ArgumentParser()
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
        default="decompme/compilers",
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

    download_queue = queue.Queue()
    results_queue = queue.Queue()

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
            for compiler in compilers:
                download_queue.put(
                    (platform_id, compiler),
                )

    if download_queue.qsize() == 0:
        logger.warning(
            "No platforms/compilers configured or enabled for host architecture (%s)",
            host_arch,
        )
        return

    threads = []
    for _ in range(args.threads):
        thread = DownloadThread(
            download_queue,
            results_queue,
            compilers_dir=compilers_dir,
            force=args.force,
            docker_registry=args.docker_registry,
            github_repo=args.github_repo,
        )
        threads.append(thread)

    start = datetime.datetime.now()

    for thread in threads:
        thread.start()

    download_queue.join()

    for thread in threads:
        thread.join(timeout=0.1)

    results = []
    while True:
        try:
            item = results_queue.get(timeout=1)
            results.append(item)
        except queue.Empty:
            break

    end = datetime.datetime.now()

    compilers_downloaded = len(list(filter(lambda x: x, results)))
    logger.info(
        "Updated %i / %i compiler(s) in %.2f second(s)",
        compilers_downloaded,
        len(results),
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
