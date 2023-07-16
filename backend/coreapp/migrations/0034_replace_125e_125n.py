import django.db.migrations.operations.special
from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def rename_compilers(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    """
    Migrate the compiler ID 'mwcc_233_163e' into 'mwcc_233_163n'
    """

    Scratch = apps.get_model("coreapp", "Scratch")
    for row in Scratch.objects.only("compiler").filter(compiler__exact="mwcc_233_163e"):
        row.compiler = "mwcc_233_163n"
        row.save(update_fields=["compiler"])


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0033_scratch_match_override"),
    ]

    operations = [
        migrations.RunPython(
            code=rename_compilers,
            reverse_code=django.db.migrations.operations.special.RunPython.noop,
        )
    ]
