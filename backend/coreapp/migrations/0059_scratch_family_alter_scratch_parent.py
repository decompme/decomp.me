import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0058_rename_gcc272sn_to_gcc272sn0004"),
    ]

    operations = [
        migrations.AddField(
            model_name="scratch",
            name="family",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="family_members",
                to="coreapp.scratch",
            ),
        ),
        migrations.AlterField(
            model_name="scratch",
            name="parent",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="children",
                to="coreapp.scratch",
            ),
        ),
    ]
