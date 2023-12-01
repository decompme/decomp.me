from django.apps.registry import Apps
from django.db import migrations, transaction
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def populate_preset_fk(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    Preset = apps.get_model("coreapp", "Preset")
    Scratch = apps.get_model("coreapp", "Scratch")
    scratch_set = Scratch.objects.all()

    with transaction.atomic():
        for scratch in scratch_set.iterator():
            if scratch.preset is not None:
                try:
                    preset = Preset.objects.get(name=scratch.preset)
                except:
                    continue
                scratch.preset_fk = preset
                scratch.save(update_fields=["preset_fk"])


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0043_scratch_preset_fk"),
    ]

    operations = [
        migrations.RunPython(
            code=populate_preset_fk,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
