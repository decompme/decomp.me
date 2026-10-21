from typing import Any
from unittest.mock import patch

from django.test import SimpleTestCase


class LifespanAppTests(SimpleTestCase):
    async def test_lifespan_startup_and_shutdown(self) -> None:
        from decompme.asgi import LifespanApp

        messages: list[dict[str, Any]] = [
            {"type": "lifespan.startup"},
            {"type": "lifespan.shutdown"},
        ]
        sent: list[dict[str, Any]] = []

        async def receive() -> dict[str, Any]:
            return messages.pop(0)

        async def send(message: dict[str, Any]) -> None:
            sent.append(message)

        async def inner_app(scope: Any, receive: Any, send: Any) -> None:
            raise AssertionError("lifespan scopes must not reach the inner app")

        with (
            patch("coreapp.cromper_client.open_cromper_client") as open_client,
            patch("coreapp.cromper_client.close_cromper_client") as close_client,
        ):
            await LifespanApp(inner_app)({"type": "lifespan"}, receive, send)

        self.assertEqual(
            sent,
            [
                {"type": "lifespan.startup.complete"},
                {"type": "lifespan.shutdown.complete"},
            ],
        )
        open_client.assert_awaited_once_with()
        close_client.assert_awaited_once_with()

    async def test_non_lifespan_scopes_are_delegated(self) -> None:
        from decompme.asgi import LifespanApp

        seen: list[Any] = []

        async def inner_app(scope: Any, receive: Any, send: Any) -> None:
            seen.append(scope)

        scope = {"type": "http", "path": "/"}
        await LifespanApp(inner_app)(scope, None, None)

        self.assertEqual(seen, [scope])
