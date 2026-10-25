from django.contrib.postgres.indexes import GinIndex, OpClass
from django.db import migrations
from django.db.models.functions import Upper


def add_trigram_indexes(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    Scratch = apps.get_model("coreapp", "Scratch")
    schema_editor.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    for index in trigram_indexes():
        schema_editor.add_index(Scratch, index, concurrently=True)


def remove_trigram_indexes(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    Scratch = apps.get_model("coreapp", "Scratch")
    for index in reversed(trigram_indexes()):
        schema_editor.remove_index(Scratch, index, concurrently=True)


def trigram_indexes():
    return [
        GinIndex(
            OpClass(Upper("name"), name="gin_trgm_ops"),
            name="scratch_upper_name_trgm",
        ),
        GinIndex(
            OpClass(Upper("diff_label"), name="gin_trgm_ops"),
            name="scratch_upper_diff_label_trgm",
        ),
    ]


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("coreapp", "0072_add_indexes_to_scratch_sort_columns"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    add_trigram_indexes,
                    reverse_code=remove_trigram_indexes,
                ),
            ],
            state_operations=[
                migrations.AddIndex(
                    model_name="scratch",
                    index=GinIndex(
                        OpClass(Upper("name"), name="gin_trgm_ops"),
                        name="scratch_upper_name_trgm",
                    ),
                ),
                migrations.AddIndex(
                    model_name="scratch",
                    index=GinIndex(
                        OpClass(Upper("diff_label"), name="gin_trgm_ops"),
                        name="scratch_upper_diff_label_trgm",
                    ),
                ),
            ],
        ),
    ]
