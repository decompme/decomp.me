import logging
import random

from sentry_sdk import metrics

logger = logging.getLogger(__name__)


def record_operation_metrics(
    operation: str,
    *,
    attributes: dict[str, str | int],
    request_duration_ms: float,
    duration_ms: float | None,
    sizes: dict[str, tuple[int, str | None]],
    sample_rate: float = 1.0,
) -> None:
    try:
        # Keep each request's count, timings, and sizes in the same sample.
        if sample_rate <= 0 or (sample_rate < 1 and random.random() >= sample_rate):
            return
        prefix = f"cromper.{operation}"
        metrics.count(f"{prefix}.requests", 1, attributes=attributes)
        metrics.distribution(
            f"{prefix}.request_duration",
            request_duration_ms,
            unit="millisecond",
            attributes=attributes,
        )
        if duration_ms is not None:
            metrics.distribution(
                f"{prefix}.duration",
                duration_ms,
                unit="millisecond",
                attributes=attributes,
            )
        for name, (size, unit) in sizes.items():
            metrics.distribution(
                f"{prefix}.{name}", size, unit=unit, attributes=attributes
            )
    except Exception:
        # Telemetry must not replace an operation result or its original error.
        logger.warning("Could not record %s metrics", operation, exc_info=True)
