# Generated by Django 4.2.5 on 2023-10-04 08:11

import coreapp.models.scratch
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0038_scratch_libraries"),
    ]

    operations = [
        migrations.AlterField(
            model_name="scratch",
            name="libraries",
            field=coreapp.models.scratch.LibrariesField(default=list),
        ),
    ]
