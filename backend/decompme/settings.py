import os
from pathlib import Path

import django_stubs_ext
import environ

import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration

django_stubs_ext.monkeypatch()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DEBUG=(bool, False),
    DJANGO_LOG_LEVEL=(str, "INFO"),
    DUMMY_COMPILER=(bool, False),
    ALLOWED_HOSTS=(list, []),
    SANDBOX_NSJAIL_BIN_PATH=(str, "/bin/nsjail"),
    SANDBOX_DISABLE_PROC=(bool, False),
    SECURE_SSL_REDIRECT=(bool, False),
    SECURE_HSTS_SECONDS=(int, 0),
    SECURE_HSTS_INCLUDE_SUBDOMAINS=(bool, False),
    SECURE_HSTS_PRELOAD=(bool, False),
    STATIC_URL=(str, "/static/"),
    STATIC_ROOT=(str, BASE_DIR / "static"),
    MEDIA_URL=(str, "/media/"),
    MEDIA_ROOT=(str, BASE_DIR / "media"),
    LOCAL_FILE_DIR=(str, BASE_DIR / "local_files"),
    USE_SANDBOX_JAIL=(bool, False),
    SESSION_COOKIE_SECURE=(bool, True),
    GITHUB_CLIENT_ID=(str, ""),
    GITHUB_CLIENT_SECRET=(str, ""),
    COMPILER_BASE_PATH=(str, BASE_DIR / "compilers"),
    COMPILATION_CACHE_SIZE=(int, 100),
    WINEPREFIX=(str, "/tmp/wine"),
    COMPILATION_TIMEOUT_SECONDS=(int, 10),
    ASSEMBLY_TIMEOUT_SECONDS=(int, 3),
    OBJDUMP_TIMEOUT_SECONDS=(int, 3),
    TIMEOUT_SCALE_FACTOR=(int, 1),
    SENTRY_DSN=(str, ""),
    SENTRY_SAMPLE_RATE=(float, 0.0),
)

for stem in [".env.local", ".env"]:
    env_file = BASE_DIR / ".." / stem
    if os.path.isfile(env_file):
        with open(env_file) as f:
            environ.Env.read_env(f)

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
DJANGO_LOG_LEVEL = env("DJANGO_LOG_LEVEL")
DUMMY_COMPILER = env("DUMMY_COMPILER")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")
LOCAL_FILE_DIR = env("LOCAL_FILE_DIR")

# Application definition

INSTALLED_APPS = [
    "rest_framework",
    "corsheaders",
    "coreapp.apps.CoreappConfig",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_filters",
    "django_cleanup.apps.CleanupConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    #'django.middleware.csrf.CsrfViewMiddleware',
    "coreapp.middleware.disable_csrf",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "coreapp.middleware.set_user_profile",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

REST_FRAMEWORK = {
    "EXCEPTION_HANDLER": "coreapp.error.custom_exception_handler",
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
}

ROOT_URLCONF = "decompme.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "decompme.wsgi.application"

DATABASES = {"default": env.db()}

# Password validation
# https://docs.djangoproject.com/en/3.2/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# Internationalization
# https://docs.djangoproject.com/en/3.2/topics/i18n/
LANGUAGE_CODE = "en-us"
TIME_ZONE = "Japan"
USE_I18N = True
USE_L10N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.2/howto/static-files/
STATIC_URL = env("STATIC_URL")
STATIC_ROOT = env("STATIC_ROOT")

# Media files (user uploads)
MEDIA_ROOT = env("MEDIA_ROOT")
MEDIA_URL = env("MEDIA_URL")
DJANGORESIZED_DEFAULT_SCALE = 1.0
DJANGORESIZED_DEFAULT_QUALITY = 100
DJANGORESIZED_DEFAULT_KEEP_META = False
DJANGORESIZED_DEFAULT_FORCE_FORMAT = "WEBP"
DJANGORESIZED_DEFAULT_FORMAT_EXTENSIONS = {"WEBP": ".webp"}
DJANGORESIZED_DEFAULT_NORMALIZE_ROTATION = True

# Default primary key field type
# https://docs.djangoproject.com/en/3.2/ref/settings/#default-auto-field
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "simple"},
    },
    "formatters": {
        "simple": {
            "format": "{asctime} {levelname} {message}",
            "style": "{",
            "datefmt": "%H:%M:%S",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "DEBUG",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": DJANGO_LOG_LEVEL,
            "propagate": False,
        },
    },
}

SECURE_SSL_REDIRECT = env("SECURE_SSL_REDIRECT")
SECURE_HSTS_SECONDS = env("SECURE_HSTS_SECONDS")
SECURE_HSTS_INCLUDE_SUBDOMAINS = env("SECURE_HSTS_INCLUDE_SUBDOMAINS")
SECURE_HSTS_PRELOAD = env("SECURE_HSTS_PRELOAD")

SESSION_COOKIE_SECURE = env("SESSION_COOKIE_SECURE")
if DEBUG:
    SESSION_COOKIE_SAMESITE = "None"
else:
    SESSION_COOKIE_SAMESITE = "Lax"

COMPILER_BASE_PATH = Path(env("COMPILER_BASE_PATH"))

USE_SANDBOX_JAIL = env("USE_SANDBOX_JAIL")
SANDBOX_NSJAIL_BIN_PATH = Path(env("SANDBOX_NSJAIL_BIN_PATH"))
SANDBOX_CHROOT_PATH = BASE_DIR.parent / "sandbox" / "root"
SANDBOX_TMP_PATH = BASE_DIR.parent / "sandbox" / "tmp"
SANDBOX_DISABLE_PROC = env("SANDBOX_DISABLE_PROC")

GITHUB_CLIENT_ID = env("GITHUB_CLIENT_ID", str)
GITHUB_CLIENT_SECRET = env("GITHUB_CLIENT_SECRET", str)

COMPILATION_CACHE_SIZE = env("COMPILATION_CACHE_SIZE", int)

WINEPREFIX = Path(env("WINEPREFIX"))

TIMEOUT_SCALE_FACTOR = env("TIMEOUT_SCALE_FACTOR", int)
COMPILATION_TIMEOUT_SECONDS = (
    env("COMPILATION_TIMEOUT_SECONDS", int) * TIMEOUT_SCALE_FACTOR
)
ASSEMBLY_TIMEOUT_SECONDS = env("ASSEMBLY_TIMEOUT_SECONDS", int) * TIMEOUT_SCALE_FACTOR
OBJDUMP_TIMEOUT_SECONDS = env("OBJDUMP_TIMEOUT_SECONDS", int) * TIMEOUT_SCALE_FACTOR

SENTRY_DSN = env("SENTRY_DSN", str)
SENTRY_SAMPLE_RATE = env("SENTRY_SAMPLE_RATE", float)

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=SENTRY_SAMPLE_RATE,
        send_default_pii=False,
    )
