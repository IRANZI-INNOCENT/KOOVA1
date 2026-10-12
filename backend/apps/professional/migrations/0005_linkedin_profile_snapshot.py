from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("professional", "0004_event_images_and_post_media"),
    ]

    operations = [
        migrations.AddField(
            model_name="linkedinconnection",
            name="profile_snapshot",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Cached LinkedIn profile fields Kova fetched for the brain.",
            ),
        ),
        migrations.AddField(
            model_name="linkedinconnection",
            name="profile_synced_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
