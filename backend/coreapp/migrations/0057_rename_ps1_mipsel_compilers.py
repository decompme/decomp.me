import django.db.migrations.operations.special
from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def rename_compilers(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    """
    Migrate the following gcc*-mipsel compilers:
        gcc2.6.0-mipsel -> gcc2.6.0-psx (new)
        gcc2.6.3-mipsel -> gcc2.6.3-psx (existing)
        gcc2.7.2-mipsel -> gcc2.7.2-psx (new)
        gcc2.8.0-mipsel -> gcc2.8.0-psx (new)
        gcc2.8.1-mipsel -> gcc2.8.1-psx (existing)
        gcc2.91.66-mipsel -> gcc2.91.66-psx (new)
        gcc2.95.2-mipsel -> gcc2.95.2-psx (new)
    """

    compiler_map = {
        "gcc2.6.0-mipsel": "gcc2.6.0-psx",
        "gcc2.6.3-mipsel": "gcc2.6.3-psx",
        "gcc2.7.2-mipsel": "gcc2.7.2-psx",
        "gcc2.8.0-mipsel": "gcc2.8.0-psx",
        "gcc2.8.1-mipsel": "gcc2.8.1-psx",
        "gcc2.91.66-mipsel": "gcc2.91.66-psx",
        "gcc2.95.2-mipsel": "gcc2.95.2-psx",
    }

    Scratch = apps.get_model("coreapp", "Scratch")
    for row in (
        Scratch.objects.only("compiler")
        .filter(platform="ps1")
        .filter(compiler__startswith="gcc")
    ):
        if row.compiler in compiler_map:
            row.compiler = compiler_map[row.compiler]
            row.save(update_fields=["compiler"])

    Preset = apps.get_model("coreapp", "Preset")
    for row in (
        Preset.objects.all().filter(platform="ps1").filter(compiler__startswith="gcc")
    ):
        if row.compiler in compiler_map:
            row.compiler = compiler_map[row.compiler]
            row.save(update_fields=["compiler"])


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0056_delete_compilerconfig"),
    ]

    operations = [
        migrations.RunPython(
            code=rename_compilers,
            reverse_code=django.db.migrations.operations.special.RunPython.noop,
        )
    ]
