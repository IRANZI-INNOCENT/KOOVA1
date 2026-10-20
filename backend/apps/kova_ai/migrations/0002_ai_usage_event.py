import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("businesses", "0001_initial"),
        ("kova_ai", "0001_kova_exchange"),
    ]

    operations = [
        migrations.CreateModel(
            name="AiUsageEvent",
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
                    "feature",
                    models.CharField(
                        db_index=True,
                        default="unknown",
                        max_length=64,
                    ),
                ),
                ("model_name", models.CharField(blank=True, max_length=120)),
                ("prompt_tokens", models.PositiveIntegerField(default=0)),
                ("completion_tokens", models.PositiveIntegerField(default=0)),
                ("total_tokens", models.PositiveIntegerField(default=0)),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, db_index=True),
                ),
                (
                    "business",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="ai_usage_events",
                        to="businesses.business",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="aiusageevent",
            index=models.Index(
                fields=["feature", "-created_at"],
                name="kova_ai_aiu_feature_7c2a1b_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="aiusageevent",
            index=models.Index(
                fields=["business", "-created_at"],
                name="kova_ai_aiu_busines_3e9d4c_idx",
            ),
        ),
    ]
