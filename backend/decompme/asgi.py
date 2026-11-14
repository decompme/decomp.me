"""ASGI entrypoint with Cromper pool lifecycle and development static file serving."""

import os
from typing import Any

from django.conf import settings
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "decompme.settings")


class LifespanApp:
    """Manage the Cromper pool through lifespan events Django does not handle."""

    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(self, scope: Any, receive: Any, send: Any) -> None:
        if scope["type"] == "lifespan":
            await self._handle_lifespan(receive, send)
        else:
            await self.app(scope, receive, send)

    @staticmethod
    async def _handle_lifespan(receive: Any, send: Any) -> None:
        while True:
            message = await receive()
            if message["type"] == "lifespan.startup":
                from coreapp.cromper_client import open_cromper_client

                await open_cromper_client()
                await send({"type": "lifespan.startup.complete"})
            elif message["type"] == "lifespan.shutdown":
                # Imported lazily so app modules load after django.setup().
                from coreapp.cromper_client import close_cromper_client

                await close_cromper_client()
                await send({"type": "lifespan.shutdown.complete"})
                return


django_application = get_asgi_application()

if settings.DEBUG:
    # Development nginx proxies /static here; uvicorn does not serve it itself.
    from django.contrib.staticfiles.handlers import ASGIStaticFilesHandler

    django_application = ASGIStaticFilesHandler(django_application)

application = LifespanApp(django_application)
