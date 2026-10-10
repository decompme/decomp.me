from types import SimpleNamespace
from unittest.mock import patch

from sentry_sdk.integrations.tornado import TornadoIntegration

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
