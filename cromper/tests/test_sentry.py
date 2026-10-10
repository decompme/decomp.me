from types import SimpleNamespace
from unittest.mock import patch

import pytest
from sentry_sdk.integrations.tornado import TornadoIntegration

from cromper.config import CromperConfig
from cromper.main import init_sentry


def test_sentry_is_disabled_without_dsn() -> None:
    config = SimpleNamespace(
        sentry_dsn="",
        sentry_sample_rate=0.0,
        sentry_timeout=3,
    )

    with patch("cromper.main.sentry_sdk.init") as init:
        init_sentry(config)  # type: ignore[arg-type]

    init.assert_not_called()


def test_sentry_is_initialized_from_config() -> None:
    config = SimpleNamespace(
        sentry_dsn="https://public@example.com/1",
        sentry_sample_rate=0.25,
        sentry_timeout=7,
    )

    with patch("cromper.main.sentry_sdk.init") as init:
        init_sentry(config)  # type: ignore[arg-type]

    init.assert_called_once()
    kwargs = init.call_args.kwargs
    assert kwargs["dsn"] == config.sentry_dsn
    assert kwargs["traces_sample_rate"] == config.sentry_sample_rate
    assert kwargs["send_default_pii"] is False
    assert kwargs["transport"].TIMEOUT == config.sentry_timeout
    assert len(kwargs["integrations"]) == 1
    assert isinstance(kwargs["integrations"][0], TornadoIntegration)


def test_metrics_sample_rate_defaults_to_all_requests() -> None:
    with patch.dict("os.environ", {}, clear=True):
        assert CromperConfig().sentry_metrics_sample_rate == 1.0


def test_metrics_sample_rate_is_configurable() -> None:
    with patch.dict("os.environ", {"SENTRY_METRICS_SAMPLE_RATE": "0.1"}):
        assert CromperConfig().sentry_metrics_sample_rate == 0.1


def test_metrics_sample_rate_rejects_invalid_values() -> None:
    for value in ("-0.1", "1.1", "nan", "inf", "invalid"):
        with (
            patch.dict("os.environ", {"SENTRY_METRICS_SAMPLE_RATE": value}),
            pytest.raises(ValueError),
        ):
            CromperConfig()
