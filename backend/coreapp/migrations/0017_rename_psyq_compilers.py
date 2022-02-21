from django.db import migrations
import django.db.migrations.operations.special


def rename_psyq_compilers(apps, schema_editor):
    """
    'Psyq4.*' compilers now use original aspsx assembler,
    so repoint old scratches to the gcc + as combo.
    """

    compiler_map = {
        "psyq4.1": "gcc2.7.2-psyq",
        "psyq4.3": "gcc2.8.1-psyq",
        "psyq4.6": "gcc2.95.2-psyq",
    }

    Scratch = apps.get_model("coreapp", "Scratch")
    for row in Scratch.objects.all():
        if row.compiler in compiler_map:
            row.compiler = compiler_map[row.compiler]
            row.save(update_fields=["compiler"])


class Migration(migrations.Migration):

    dependencies = [
        ("coreapp", "0016_give_scratches_project_functions"),
    ]

    operations = [
        migrations.RunPython(
            code=rename_psyq_compilers,
            reverse_code=django.db.migrations.operations.special.RunPython.noop,
        ),
    ]
