from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0053_rename_mwcps2_compilers"),
    ]

    operations = [
        migrations.AddField(
            model_name="preset",
            name="owner",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.SET_NULL,
                to="coreapp.profile",
            ),
        ),
    ]
