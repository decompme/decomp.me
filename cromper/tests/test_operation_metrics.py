from unittest.mock import patch

import pytest
import sentry_sdk
from sentry_sdk.transport import Transport

from cromper.handlers.metrics import record_operation_metrics


@pytest.mark.parametrize("method", ["count", "distribution"])
def test_metric_failure_does_not_escape(method):
    with patch(
        f"cromper.handlers.metrics.metrics.{method}",
        side_effect=RuntimeError("SDK failed"),
    ):
        record_operation_metrics(
            "compile",
            attributes={"platform": "n64"},
            request_duration_ms=20,
            duration_ms=10,
            sizes={},
        )


def test_metrics_are_sent_with_tracing_disabled():
    envelopes = []

    class MemoryTransport(Transport):
        def capture_envelope(self, envelope):
            envelopes.append(envelope)

    client = sentry_sdk.Client(
        dsn="https://public@example.com/1",
        transport=MemoryTransport,
        default_integrations=False,
        traces_sample_rate=0,
    )
    try:
        with sentry_sdk.new_scope() as scope:
            scope.set_client(client)
            record_operation_metrics(
                "compile",
                attributes={"platform": "n64", "outcome": "success"},
                request_duration_ms=20,
                duration_ms=10,
                sizes={"input_size": (0, None)},
            )
            client.flush()
        metrics = [
            metric
            for envelope in envelopes
            for item in envelope.items
            if item.type == "trace_metric"
            for metric in item.payload.json["items"]
        ]
        assert {metric["name"] for metric in metrics} == {
            "cromper.compile.requests",
            "cromper.compile.request_duration",
            "cromper.compile.duration",
            "cromper.compile.input_size",
        }
        assert (
            next(metric for metric in metrics if metric["name"].endswith("input_size"))[
                "value"
            ]
            == 0
        )
        assert all(
            metric["attributes"]["platform"]["value"] == "n64" for metric in metrics
        )
        assert not any(
            item.type == "transaction"
            for envelope in envelopes
            for item in envelope.items
        )
    finally:
        client.close()


@pytest.mark.parametrize(
    "rate, draw, published",
    [
        (0, 0, False),
        (1, 0.99, True),
        (0.1, 0.05, True),
        (0.1, 0.1, False),
        (0.1, 0.9, False),
    ],
)
def test_sampling_keeps_or_drops_the_entire_request(rate, draw, published):
    with (
        patch(
            "cromper.handlers.metrics.random.random", return_value=draw
        ) as random_draw,
        patch("cromper.handlers.metrics.metrics") as metrics,
    ):
        record_operation_metrics(
            "compile",
            attributes={},
            request_duration_ms=20,
            duration_ms=10,
            sizes={"input_size": (50, None)},
            sample_rate=rate,
        )
    assert metrics.count.call_count == int(published)
    assert metrics.distribution.call_count == (3 if published else 0)
    assert random_draw.call_count == (1 if 0 < rate < 1 else 0)
