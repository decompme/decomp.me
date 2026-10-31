import django.db.migrations.operations.special
from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def rename_compilers(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    """
    Migrate the compiler ID 'ido5.3_c++' to 'ido5.3_cfront'
    """

    compiler_map = {
        "ido5.3_c++": "ido5.3_cfront",
    }

    Scratch = apps.get_model("coreapp", "Scratch")
    for row in (
        Scratch.objects.only("compiler")
        .filter(platform="n64")
        .filter(compiler="ido5.3_c++")
    ):
        if row.compiler in compiler_map:
            row.compiler = compiler_map[row.compiler]
            row.save(update_fields=["compiler"])

    Preset = apps.get_model("coreapp", "Preset")
    for row in (
        Preset.objects.all().filter(platform="n64").filter(compiler="ido5.3_c++")
    ):
        if row.compiler in compiler_map:
            row.compiler = compiler_map[row.compiler]
            row.save(update_fields=["compiler"])


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0073_add_scratch_search_trigram_indexes"),
    ]

    operations = [
        migrations.RunPython(
            code=rename_compilers,
            reverse_code=django.db.migrations.operations.special.RunPython.noop,
        )
    ]