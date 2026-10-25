from django.contrib.postgres.indexes import GinIndex, OpClass
from django.contrib.postgres.operations import AddIndexConcurrently, TrigramExtension
from django.db import migrations
from django.db.models.functions import Upper


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("coreapp", "0072_add_indexes_to_scratch_sort_columns"),
    ]

    operations = [
        TrigramExtension(),
        AddIndexConcurrently(
            model_name="scratch",
            index=GinIndex(
                OpClass(Upper("name"), name="gin_trgm_ops"),
                name="scratch_upper_name_trgm",
            ),
        ),
        AddIndexConcurrently(
            model_name="scratch",
            index=GinIndex(
                OpClass(Upper("diff_label"), name="gin_trgm_ops"),
                name="scratch_upper_diff_label_trgm",
            ),
        ),
    ]
