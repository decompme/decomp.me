import contextlib

from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any, Optional

from django.conf import settings


class Sandbox(contextlib.AbstractContextManager["Sandbox"]):
    def __enter__(self) -> "Sandbox":
        self.use_jail = settings.USE_SANDBOX_JAIL

        tmpdir: Optional[str] = None
        if self.use_jail:
            # Only use SANDBOX_TMP_PATH if USE_SANDBOX_JAIL is enabled,
            # otherwise use the system default
            settings.SANDBOX_TMP_PATH.mkdir(parents=True, exist_ok=True)
            tmpdir = str(settings.SANDBOX_TMP_PATH)

        self.temp_dir = TemporaryDirectory(dir=tmpdir)
        self.path = Path(self.temp_dir.name)
        return self

    def __exit__(self, *exc: Any) -> None:
        self.temp_dir.cleanup()
