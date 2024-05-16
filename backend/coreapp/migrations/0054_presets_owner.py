from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("coreapp", "0040_create_preset"),
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
