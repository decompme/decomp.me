# Generated by Django 4.2.5 on 2023-10-05 02:28

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0040_preset_remove_projectfunction_import_config_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="preset",
            name="decompiler_flags",
            field=models.TextField(blank=True, default="", max_length=1000),
        ),
    ]