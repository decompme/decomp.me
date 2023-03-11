import django.db.migrations.operations.special
from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def rename_compilers(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    """
    Migrate old compiler ids to new ones
    """

    compiler_map = {
        "gcc2.7kmc": "gcc2.7.2kmc",
        "mwcc_247_108_tp": "mwcc_247_108",
    }

    Scratch = apps.get_model("coreapp", "Scratch")
    for row in Scratch.objects.all():
        if row.compiler in compiler_map:
            row.compiler = compiler_map[row.compiler]
            row.save(update_fields=["compiler"])


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0017_rename_psyq_compilers"),
    ]

    operations = [
        migrations.RunPython(
            code=rename_compilers,
            reverse_code=django.db.migrations.operations.special.RunPython.noop,
        )
    ]
