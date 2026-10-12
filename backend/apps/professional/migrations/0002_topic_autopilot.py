from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("professional", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="professionalprofile",
            name="topic_autopilot_enabled",
            field=models.BooleanField(
                default=False,
                help_text="Kova plans, drafts, and schedules a new topic week each calendar week.",
            ),
        ),
        migrations.AddField(
            model_name="professionalprofile",
            name="topic_autopilot_standing_topic",
            field=models.CharField(
                blank=True,
                help_text="Default theme when autopilot runs (optional).",
                max_length=240,
            ),
        ),
        migrations.AddField(
            model_name="professionalprofile",
            name="topic_autopilot_last_run_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
