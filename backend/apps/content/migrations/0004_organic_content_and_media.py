# Generated manually for organic content and owner media.

import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("businesses", "0001_initial"),
        ("content", "0003_content_social_account_contentbatch_content_batch"),
    ]

    operations = [
        migrations.AddField(
            model_name="contentbatch",
            name="kind",
            field=models.CharField(
                choices=[
                    ("product", "Product campaign"),
                    ("organic", "Organic campaign"),
                    ("owner_video", "Owner video"),
                ],
                default="product",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="contentbatch",
            name="organic_theme",
            field=models.CharField(blank=True, max_length=40),
        ),
        migrations.CreateModel(
            name="OwnerMediaAsset",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "media_type",
                    models.CharField(
                        choices=[("image", "Image"), ("video", "Video")],
                        max_length=10,
                    ),
                ),
                ("file", models.FileField(upload_to="content/owner_media/")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "business",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="owner_media",
                        to="businesses.business",
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
            },
        ),
    ]
