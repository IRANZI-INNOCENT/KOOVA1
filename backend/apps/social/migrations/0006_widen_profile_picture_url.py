from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("social", "0005_autopilot_shift"),
    ]

    operations = [
        migrations.AlterField(
            model_name="socialaccount",
            name="profile_picture_url",
            field=models.URLField(blank=True, max_length=2048),
        ),
    ]
