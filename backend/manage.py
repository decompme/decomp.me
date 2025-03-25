#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "decompme.settings")

    from django.conf import settings

    if settings.DEBUG:
        # This variable gets set by django, the check is necessary to make auto reload work properly
        if os.environ.get("RUN_MAIN"):
            import debugpy

            debugpy.listen(("0.0.0.0", 5678))

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
