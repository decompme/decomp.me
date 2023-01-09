import django.db.migrations.operations.special
from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def rename_compilers(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    """
    Migrate the compiler ID 'gcc-263-mipsel' into 'psyq3.6'
    """

    compiler_map = {
        "gcc2.6.3-mipsel": "psyq3.6",
    }

    Scratch = apps.get_model("coreapp", "Scratch")
    for row in Scratch.objects.only("compiler").filter(
        compiler__endswith="gcc2.6.3-mipsel"
    ):
        if row.compiler in compiler_map:
            row.compiler = compiler_map[row.compiler]
            row.save(update_fields=["compiler"])


class Migration(migrations.Migration):

    dependencies = [
        ("coreapp", "0029_courses"),
    ]

    operations = [
        migrations.RunPython(
            code=rename_compilers,
            reverse_code=django.db.migrations.operations.special.RunPython.noop,
        )
    ]
