import os
from pathlib import Path

from tornado.options import (
    options as settings,
    define as tornado_define,
)


def truthy(x):
    return x.lower() in ["true", "1", "yes", "on"]


def define(name, default=None, type=str):
    """Allows defaulting of command-line arguments from environment variables"""
    setting = os.environ.get(name.upper())
    if setting is None:
        setting = default
    else:
        setting = truthy(setting) if type is bool else type(setting)

    tornado_define(name, setting, type)
    return (name, setting, type)


def is_supported_platform(platform_id):
    if settings.SUPPORTED_PLATFORMS is None:
        return True
    return platform_id in settings.SUPPORTED_PLATFORMS.split(",")


BASE_DIR = Path(__file__).resolve().parent.parent

define("PORT", default=9000, type=int)
define("MAX_WORKERS", default=32, type=int)

define("DEBUG", default=True, type=bool)

define("INTERNAL_API_BASE", default="http://backend:8000/api", type=str)

define("SUPPORTED_PLATFORMS", default=None, type=str)

define("DUMMY_COMPILER", default=False, type=bool)

define("USE_SANDBOX_JAIL", default=True, type=bool)
define("SANDBOX_CHROOT_PATH", default=Path("/sandbox"), type=Path)
define("SANDBOX_TMP_PATH", default=Path("/sandbox/tmp"), type=Path)
define("SANDBOX_NSJAIL_BIN_PATH", default=Path("/bin/nsjail"), type=Path)
define("SANDBOX_DISABLE_PROC", default=True, type=bool)

define("WINEPREFIX", default=Path("/tmp/wine"), type=Path)

define("COMPILER_BASE_PATH", default=BASE_DIR / "compilers", type=Path)
define("LIBRARY_BASE_PATH", default=BASE_DIR / "libraries", type=Path)

define("COMPILATION_TIMEOUT_SECONDS", default=30, type=int)
define("ASSEMBLY_TIMEOUT_SECONDS", default=30, type=int)
define("OBJDUMP_TIMEOUT_SECONDS", default=30, type=int)
