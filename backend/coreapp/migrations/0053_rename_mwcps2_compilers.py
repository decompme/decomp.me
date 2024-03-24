import django.db.migrations.operations.special
from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def rename_compilers(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    """
    Migrate the following mwcps2 compilers:
    - mwcps2-3.0b22-011126 -> mwcps2-3.0-011126
    - mwcps2-3.0b22-020123 -> mwcps2-3.0.1-020123
    - mwcps2-3.0b22-020716 -> mwcps2-3.0.3-020716
    """

    compiler_map = {
        "mwcps2-3.0b22-011126": "mwcps2-3.0-011126",
        "mwcps2-3.0b22-020123": "mwcps2-3.0.1-020123",
        "mwcps2-3.0b22-020716": "mwcps2-3.0.3-020716",
    }

    Scratch = apps.get_model("coreapp", "Scratch")
    for row in (
        Scratch.objects.only("compiler")
        .filter(platform="ps2")
        .filter(compiler__startswith="mwcps2-3.0b22")
    ):
        if row.compiler in compiler_map:
            row.compiler = compiler_map[row.compiler]
            row.save(update_fields=["compiler"])


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0052_win9x_to_win32"),
    ]

    operations = [
        migrations.RunPython(
            code=rename_compilers,
            reverse_code=django.db.migrations.operations.special.RunPython.noop,
        )
    ]
