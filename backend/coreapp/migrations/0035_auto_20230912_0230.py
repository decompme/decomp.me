import django.db.migrations.operations.special
from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def rename_compilers(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    """
    Migrate the compiler ID 'gcc2.8.1' into 'gcc2.8.1pm'
    """

    compiler_map = {
        "gcc2.8.1": "gcc.2.8.1pm",
    }

    Scratch = apps.get_model("coreapp", "Scratch")
    for row in (
        Scratch.objects.only("compiler")
        .filter(platform="n64")
        .filter(compiler="gcc2.8.1")
    ):
        if row.compiler in compiler_map:
            row.compiler = compiler_map[row.compiler]
            row.save(update_fields=["compiler"])


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0034_replace_125e_125n"),
    ]

    operations = [
        migrations.RunPython(
            code=rename_compilers,
            reverse_code=django.db.migrations.operations.special.RunPython.noop,
        )
    ]
