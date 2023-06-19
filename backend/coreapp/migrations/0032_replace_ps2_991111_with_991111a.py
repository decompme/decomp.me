import django.db.migrations.operations.special
from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def rename_compilers(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    """
    Migrate the compiler ID 'ee-gcc2.9-991111' into 'ee-gcc2.9-991111a'
    """

    compiler_map = {
        "ee-gcc2.9-991111": "ee-gcc2.9-991111a",
    }

    Scratch = apps.get_model("coreapp", "Scratch")
    for row in Scratch.objects.only("compiler").filter(
        compiler__endswith="ee-gcc2.9-991111"
    ):
        if row.compiler in compiler_map:
            row.compiler = compiler_map[row.compiler]
            row.save(update_fields=["compiler"])


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0031_raise_scratch_and_diff_label_length_limit_to_1024"),
    ]

    operations = [
        migrations.RunPython(
            code=rename_compilers,
            reverse_code=django.db.migrations.operations.special.RunPython.noop,
        )
    ]
