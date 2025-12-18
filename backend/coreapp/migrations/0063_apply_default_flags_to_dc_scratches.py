import django.db.migrations.operations.special
from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def apply_compiler_flags(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    """
    Adds back extra=a=1800, pic=0 and aggressive=2 (except for v5r10) flags to existing Dreamcast scratches
    """

    Scratch = apps.get_model("coreapp", "Scratch")
    for row in Scratch.objects.only("compiler", "compiler_flags").filter(
        platform="dreamcast"
    ):
        new_compiler_flags = "-extra=asm=1800 -pic=0 " + row.compiler_flags
        if row.compiler != "shc-v5.0r10":
            new_compiler_flags = "-aggressive=2 " + new_compiler_flags

        row.compiler_flags = new_compiler_flags
        row.save(update_fields=["compiler_flags"])


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0062_alter_profile_last_request_date"),
    ]

    operations = [
        migrations.RunPython(
            code=apply_compiler_flags,
            reverse_code=django.db.migrations.operations.special.RunPython.noop,
        )
    ]
