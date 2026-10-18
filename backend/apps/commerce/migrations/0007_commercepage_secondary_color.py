from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("commerce", "0006_commercepagebanner"),
    ]

    operations = [
        migrations.AddField(
            model_name="commercepage",
            name="secondary_color",
            field=models.CharField(
                blank=True,
                default="#17211D",
                help_text="Supporting color for badges, labels, and soft fills as #RRGGBB.",
                max_length=7,
            ),
        ),
    ]
