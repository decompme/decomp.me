from django import template
from django.utils.safestring import mark_safe
from django.conf import settings

from pathlib import Path


def load_icons():
    icons = {}
    icon_dir = Path(__file__).resolve().parent / "icons"

    for path in icon_dir.glob("*.svg"):
        icon_name = path.stem
        with path.open() as f:
            svg_content = f.read()
        icons[icon_name] = mark_safe(svg_content.replace("<svg", "<svg class='icon'"))

    return icons


register = template.Library()
icons = load_icons()


@register.simple_tag
def icon(icon_name):
    global icons

    try:
        return icons[icon_name]
    except KeyError:
        # Try to load icons again in DEBUG, in case an icon has been added since the server started
        if settings.DEBUG:
            icons = load_icons()
            if icon_name in icons:
                return icons[icon_name]

    raise template.TemplateSyntaxError(f"Icon '{icon_name}' does not exist")
