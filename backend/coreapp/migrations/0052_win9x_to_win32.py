from django.apps.registry import Apps
from django.db import migrations, transaction
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def change_win9x_to_win32(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    Preset = apps.get_model("coreapp", "Preset")
    Scratch = apps.get_model("coreapp", "Scratch")
    CompilerConfig = apps.get_model("coreapp", "CompilerConfig")
    scratch_set = Scratch.objects.all()
    compiler_config_set = CompilerConfig.objects.all()
    preset_set = Preset.objects.all()

    with transaction.atomic():
        for scratch in scratch_set.iterator():
            if scratch.platform == "win9x":
                scratch.platform = "win32"
                scratch.save(update_fields=["platform"])

        for compiler_config in compiler_config_set.iterator():
            if compiler_config.platform == "win9x":
                compiler_config.platform = "win32"
                compiler_config.save(update_fields=["platform"])

        for preset in preset_set.iterator():
            if preset.platform == "win9x":
                preset.platform = "win32"
                preset.save(update_fields=["platform"])


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0051_alter_compilerconfig_diff_flags_and_more"),
    ]

    operations = [
        migrations.RunPython(
            code=change_win9x_to_win32,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
