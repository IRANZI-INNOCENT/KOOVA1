from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("professional", "0003_profile_setup_complete"),
    ]

    operations = [
        migrations.AddField(
            model_name="professionalpost",
            name="media_urls",
            field=models.JSONField(
                blank=True,
                default=list,
                help_text="Public URLs of images to publish with this post (event moments).",
            ),
        ),
        migrations.CreateModel(
            name="ProfessionalEventImage",
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
                ("image", models.ImageField(upload_to="professional/events/")),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                (
                    "program",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="event_images",
                        to="professional.professionalprogram",
                    ),
                ),
            ],
            options={
                "ordering": ["sort_order", "id"],
            },
        ),
    ]
