from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("business_brain", "0010_businessbrand_kenya_relatable_mode"),
    ]

    operations = [
        migrations.AddField(
            model_name="businesspolicy",
            name="facebook_max_posts_per_day",
            field=models.PositiveSmallIntegerField(
                default=2,
                help_text="Max Facebook Page posts per day (recommended 1–2).",
                validators=[
                    MinValueValidator(0),
                    MaxValueValidator(10),
                ],
            ),
        ),
        migrations.AddField(
            model_name="businesspolicy",
            name="facebook_max_posts_per_week",
            field=models.PositiveSmallIntegerField(
                default=10,
                help_text="Max Facebook Page posts per week (recommended ~7–14).",
                validators=[
                    MinValueValidator(0),
                    MaxValueValidator(40),
                ],
            ),
        ),
        migrations.AddField(
            model_name="businesspolicy",
            name="instagram_max_posts_per_day",
            field=models.PositiveSmallIntegerField(
                default=1,
                help_text="Max Instagram feed posts per day (recommended ~1).",
                validators=[
                    MinValueValidator(0),
                    MaxValueValidator(10),
                ],
            ),
        ),
        migrations.AddField(
            model_name="businesspolicy",
            name="instagram_max_posts_per_week",
            field=models.PositiveSmallIntegerField(
                default=5,
                help_text="Max Instagram feed posts per week (recommended 3–5).",
                validators=[
                    MinValueValidator(0),
                    MaxValueValidator(40),
                ],
            ),
        ),
        migrations.AddField(
            model_name="businesspolicy",
            name="min_hours_between_posts",
            field=models.PositiveSmallIntegerField(
                default=4,
                help_text="Minimum hours between posts on the same channel.",
                validators=[
                    MinValueValidator(1),
                    MaxValueValidator(48),
                ],
            ),
        ),
    ]
