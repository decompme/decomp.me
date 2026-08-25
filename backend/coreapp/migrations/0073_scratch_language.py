from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "coreapp",
            "0072_add_indexes_to_scratch_sort_columns",
        ),
    ]

    operations = [
        migrations.AddField(
            model_name="scratch",
            name="language",
            field=models.CharField(
                blank=True, editable=False, max_length=32, null=True
            ),
        ),
    ]
