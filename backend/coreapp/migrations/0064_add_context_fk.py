from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0063_apply_default_flags_to_dc_scratches"),
    ]
    operations = [
        migrations.CreateModel(
            name="Context",
            fields=[
                ("text", models.TextField()),
                ("hash", models.BinaryField(max_length=8, unique=True, db_index=True)),
            ],
        ),
        migrations.AddField(
            model_name="scratch",
            name="context_fk",
            field=models.ForeignKey(
                blank=True, null=True, on_delete=models.PROTECT, to="coreapp.context"
            ),
        ),
    ]
