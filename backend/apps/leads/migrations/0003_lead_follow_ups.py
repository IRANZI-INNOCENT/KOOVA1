from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("leads", "0002_social_employee"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="follow_up_draft",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="lead",
            name="last_followed_up_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="lead",
            name="next_follow_up_at",
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
    ]
