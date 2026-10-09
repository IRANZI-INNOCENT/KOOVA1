from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("business_brain", "0005_businesspolicy"),
        ("businesses", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="BusinessMarketBrief",
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
                    "status",
                    models.CharField(
                        choices=[
                            ("empty", "Empty"),
                            ("ready", "Ready"),
                            ("skipped", "Skipped"),
                        ],
                        default="empty",
                        max_length=20,
                    ),
                ),
                ("kept", models.BooleanField(default=False)),
                ("summary", models.TextField(blank=True)),
                ("competitors", models.JSONField(blank=True, default=list)),
                ("gap", models.TextField(blank=True)),
                ("positioning", models.TextField(blank=True)),
                ("sources", models.JSONField(blank=True, default=list)),
                ("researched_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "business",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="market_brief",
                        to="businesses.business",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
