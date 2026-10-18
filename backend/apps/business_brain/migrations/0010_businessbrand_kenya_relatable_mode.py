from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("business_brain", "0009_social_employee"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessbrand",
            name="kenya_relatable_mode",
            field=models.BooleanField(
                default=False,
                help_text=(
                    "When on, Kova writes Kenya-relatable copy (Sheng/Swahili mix, "
                    "everyday scenes) and reel/skit film briefs. Off keeps default Kova."
                ),
            ),
        ),
    ]
