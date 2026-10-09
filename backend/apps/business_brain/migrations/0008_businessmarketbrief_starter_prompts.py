from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("business_brain", "0007_businesspolicy_social_operating_mode"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessmarketbrief",
            name="starter_prompts",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="businessmarketbrief",
            name="starter_prompts_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
