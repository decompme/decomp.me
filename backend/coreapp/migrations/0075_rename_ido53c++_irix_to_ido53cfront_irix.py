import django.db.migrations.operations.special
from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def rename_compilers(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    """
    Migrate the compiler ID 'ido5.3_c++_irix' to 'ido5.3_cfront_irix'
    """

    compiler_map = {
        "ido5.3_c++_irix": "ido5.3_cfront_irix",
    }

    Scratch = apps.get_model("coreapp", "Scratch")
    for row in (
        Scratch.objects.only("compiler")
        .filter(platform="irix")
        .filter(compiler="ido5.3_c++_irix")
    ):
        if row.compiler in compiler_map:
            row.compiler = compiler_map[row.compiler]
            row.save(update_fields=["compiler"])

    Preset = apps.get_model("coreapp", "Preset")
    for row in (
        Preset.objects.all().filter(platform="irix").filter(compiler="ido5.3_c++_irix")
    ):
        if row.compiler in compiler_map:
            row.compiler = compiler_map[row.compiler]
            row.save(update_fields=["compiler"])


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0074_rename_ido53c++_to_ido53cfront"),
    ]

    operations = [
        migrations.RunPython(
            code=rename_compilers,
            reverse_code=django.db.migrations.operations.special.RunPython.noop,
        )
    ]