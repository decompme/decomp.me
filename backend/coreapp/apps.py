import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class CoreappConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "coreapp"

    def ready(self) -> None:
        """Initialize cromper client cache when Django starts."""

        try:
            from .cromper_client import get_cromper_client

            client = get_cromper_client()
            # Warm up the cache
            compilers = client.get_compilers()
            platforms = client.get_platforms()
            logger.info(
                f"cromper cache initialized: {len(compilers)} compilers, {len(platforms)} platforms"
            )
        except Exception as e:
            logger.warning(f"Failed to initialize cromper cache: {e}")
            # Don't fail Django startup if cromper is unavailable
