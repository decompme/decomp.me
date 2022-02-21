from django.db import migrations
import django.db.migrations.operations.special


def rename_psyq43(apps, schema_editor):
    """
    Psyq4.3 no longer exists, its been replaced with gcc2.7.2-psyq
    """
    Scratch = apps.get_model("coreapp", "Scratch")
    for row in Scratch.objects.all():
        if row.compiler == "psyq4.3":
            row.compiler = "gcc2.7.2-psyq"
            row.save(update_fields=["compiler"])


class Migration(migrations.Migration):

    dependencies = [
        ("coreapp", "0016_give_scratches_project_functions"),
    ]

    operations = [
        migrations.RunPython(
            code=rename_psyq43,
            reverse_code=django.db.migrations.operations.special.RunPython.noop,
        ),
    ]
