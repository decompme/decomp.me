import django.db.migrations.operations.special
from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def rename_compilers(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    """
    Migrate 'psyq gcc + gnu as' compiler ids to 'psyq gcc + psyq assembler'
    """

    compiler_map = {
        "gcc2.7.2-psyq": "psyq4.1",  # conflating as both 4.0 and 4.1 are gcc2.7.2
        "gcc2.8.1-psyq": "psyq4.3",
        "gcc2.95.2-psyq": "psyq4.6",
    }

    Scratch = apps.get_model("coreapp", "Scratch")
    for row in Scratch.objects.only("compiler").filter(compiler__endswith="-psyq"):
        if row.compiler in compiler_map:
            row.compiler = compiler_map[row.compiler]
            row.save(update_fields=["compiler"])


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0023_alter_scratch_diff_label"),
    ]

    operations = [
        migrations.RunPython(
            code=rename_compilers,
            reverse_code=django.db.migrations.operations.special.RunPython.noop,
        )
    ]
