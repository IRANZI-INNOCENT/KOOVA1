from django.db import migrations, models


def seed_routes(apps, schema_editor):
    AiModelRoute = apps.get_model("kova_ai", "AiModelRoute")
    defaults = [
        ("inbox", "google/gemini-2.5-flash-lite"),
        ("broadcast_pack", "google/gemini-2.5-flash-lite"),
        ("organic_seeds", "google/gemini-2.5-flash-lite"),
        ("schedule", "google/gemini-2.5-flash-lite"),
        ("starters", "google/gemini-2.5-flash-lite"),
        ("business_draft", "google/gemini-2.5-flash-lite"),
        ("draft", "google/gemini-3.1-flash-lite"),
        ("organic", "google/gemini-3.1-flash-lite"),
        ("campaign", "google/gemini-3.1-flash-lite"),
        ("morning_brief", "google/gemini-3.1-flash-lite"),
        ("weekly_brief", "google/gemini-3.1-flash-lite"),
        ("autopilot", "google/gemini-3.1-flash-lite"),
        ("ask_kova", "google/gemini-3.1-flash-lite"),
        ("product_vision", "google/gemini-3.1-flash-lite"),
        ("product_polish", "google/gemini-3.1-flash-lite"),
        ("market_research", "google/gemini-3.1-flash-lite"),
        ("website_scan", "google/gemini-3.1-flash-lite"),
        ("professional", "google/gemini-3.1-flash-lite"),
        ("reasoning", "google/gemini-2.5-flash-lite"),
    ]
    existing = set(
        AiModelRoute.objects.filter(
            task_key__in=[row[0] for row in defaults],
        ).values_list("task_key", flat=True)
    )
    AiModelRoute.objects.bulk_create(
        [
            AiModelRoute(task_key=key, model_id=model)
            for key, model in defaults
            if key not in existing
        ]
    )


def unseed_routes(apps, schema_editor):
    AiModelRoute = apps.get_model("kova_ai", "AiModelRoute")
    AiModelRoute.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ("kova_ai", "0002_ai_usage_event"),
    ]

    operations = [
        migrations.CreateModel(
            name="AiModelRoute",
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
                    "task_key",
                    models.CharField(
                        db_index=True,
                        help_text="Stable task id (inbox, product_vision, ask_kova, …).",
                        max_length=64,
                        unique=True,
                    ),
                ),
                (
                    "model_id",
                    models.CharField(
                        help_text=(
                            "OpenRouter model slug, e.g. google/gemini-2.5-flash-lite."
                        ),
                        max_length=120,
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "AI model route",
                "verbose_name_plural": "AI model control",
                "ordering": ["task_key"],
            },
        ),
        migrations.RunPython(seed_routes, unseed_routes),
    ]
