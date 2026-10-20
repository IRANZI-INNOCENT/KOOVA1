from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("businesses", "0001_initial"),
        ("brief", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="WeeklyReport",
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
                    "week_start",
                    models.DateField(
                        help_text="Monday (Nairobi) of the week this report covers.",
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("generating", "Generating"),
                            ("ready", "Ready"),
                            ("failed", "Failed"),
                        ],
                        default="generating",
                        max_length=20,
                    ),
                ),
                ("greeting", models.CharField(blank=True, max_length=200)),
                ("sections", models.JSONField(blank=True, default=dict)),
                ("evidence", models.JSONField(blank=True, default=dict)),
                ("error_message", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "business",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="weekly_reports",
                        to="businesses.business",
                    ),
                ),
            ],
            options={
                "ordering": ["-week_start", "-created_at"],
                "unique_together": {("business", "week_start")},
            },
        ),
    ]
