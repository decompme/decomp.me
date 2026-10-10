"""Deterministic revision of the metadata served by Cromper."""

import hashlib
import json
from dataclasses import asdict

from . import flags, libraries
from .config import CromperConfig


def metadata_revision(config: CromperConfig) -> str:
    """Hash public metadata, excluding process identity and installation paths."""
    compilers = sorted(
        config.compilers_instance.available_compilers(),
        key=lambda compiler: compiler.id,
    )
    platform_ids = {compiler.platform.id for compiler in compilers}
    platforms = {}
    for platform in config.platforms_instance.all_platforms().values():
        if platform.id in platform_ids:
            data = platform.to_json(
                compilers=config.compilers_instance, include_compilers=True
            )
            data["compilers"] = sorted(
                compiler.id
                for compiler in compilers
                if compiler.platform.id == platform.id
            )
            platforms[platform.id] = data
    metadata = {
        "compilers": {compiler.id: compiler.to_json() for compiler in compilers},
        "platforms": platforms,
        "flags": flags.compiler_flag_classes_to_json(
            compiler.flag_class for compiler in compilers
        ),
        "diff_flags": flags.diff_flag_classes_to_json(
            compiler.platform.diff_flag_class for compiler in compilers
        ),
        "libraries": [
            asdict(library)
            for library in sorted(
                libraries.available_libraries(config),
                key=lambda library: (library.platform, library.name),
            )
        ],
    }
    return hashlib.sha256(
        json.dumps(metadata, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
