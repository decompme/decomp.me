# Generated by Django 3.2.6 on 2022-02-15 16:37

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("coreapp", "0013_scratch_name_default"),
    ]

    operations = [
        migrations.CreateModel(
            name="CompilerConfig",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("compiler", models.CharField(max_length=100)),
                ("platform", models.CharField(max_length=100)),
                (
                    "compiler_flags",
                    models.TextField(blank=True, default="", max_length=1000),
                ),
            ],
        ),
        migrations.CreateModel(
            name="GitHubRepo",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("owner", models.CharField(max_length=100)),
                ("repo", models.CharField(max_length=100)),
                ("branch", models.CharField(default="master", max_length=100)),
                ("is_pulling", models.BooleanField(default=False)),
                ("last_pulled", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "verbose_name": "GitHub repo",
                "verbose_name_plural": "GitHub repos",
            },
        ),
        migrations.CreateModel(
            name="Project",
            fields=[
                ("slug", models.SlugField(primary_key=True, serialize=False)),
                ("creation_time", models.DateTimeField(auto_now_add=True)),
                ("icon_url", models.URLField()),
                (
                    "repo",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.PROTECT,
                        to="coreapp.githubrepo",
                    ),
                ),
            ],
        ),
        migrations.AlterModelOptions(
            name="scratch",
            options={
                "ordering": ["-creation_time"],
                "verbose_name_plural": "Scratches",
            },
        ),
        migrations.AlterField(
            model_name="scratch",
            name="parent",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="coreapp.scratch",
            ),
        ),
        migrations.CreateModel(
            name="ProjectMember",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="coreapp.profile",
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="coreapp.project",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ProjectImportConfig",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "display_name",
                    models.CharField(blank=True, default="", max_length=512),
                ),
                ("src_dir", models.CharField(default="src", max_length=100)),
                (
                    "nonmatchings_dir",
                    models.CharField(default="asm/nonmatchings", max_length=100),
                ),
                (
                    "nonmatchings_glob",
                    models.CharField(default="**/*.s", max_length=100),
                ),
                (
                    "symbol_addrs_path",
                    models.CharField(default="symbol_addrs.txt", max_length=100),
                ),
                (
                    "compiler_config",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        to="coreapp.compilerconfig",
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="coreapp.project",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ProjectFunction",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("rom_address", models.IntegerField()),
                ("creation_time", models.DateTimeField(auto_now_add=True)),
                ("display_name", models.CharField(max_length=128)),
                ("is_matched_in_repo", models.BooleanField(default=False)),
                ("src_file", models.CharField(max_length=256)),
                ("asm_file", models.CharField(max_length=256)),
                (
                    "import_config",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="coreapp.projectimportconfig",
                    ),
                ),
                (
                    "project",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        to="coreapp.project",
                    ),
                ),
            ],
        ),
        migrations.AddField(
            model_name="scratch",
            name="project_function",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to="coreapp.projectfunction",
            ),
        ),
        migrations.AddConstraint(
            model_name="projectmember",
            constraint=models.UniqueConstraint(
                fields=("project", "profile"), name="unique_project_member"
            ),
        ),
        migrations.AddConstraint(
            model_name="projectfunction",
            constraint=models.UniqueConstraint(
                fields=("project", "rom_address"), name="unique_project_function_addr"
            ),
        ),
    ]
