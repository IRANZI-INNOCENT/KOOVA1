from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("professional", "0002_topic_autopilot"),
    ]

    operations = [
        migrations.AddField(
            model_name="professionalprofile",
            name="profile_setup_complete",
            field=models.BooleanField(
                default=False,
                help_text="User finished LinkedIn profile basics and at least one pillar.",
            ),
        ),
    ]
