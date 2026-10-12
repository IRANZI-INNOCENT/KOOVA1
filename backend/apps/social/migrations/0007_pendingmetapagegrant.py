# Generated manually for one-brain-per-page flow

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("social", "0006_widen_profile_picture_url"),
    ]

    operations = [
        migrations.CreateModel(
            name="PendingMetaPageGrant",
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
                ("page_id", models.CharField(max_length=200)),
                ("page_name", models.CharField(blank=True, max_length=200)),
                ("page_access_token", models.TextField()),
                ("token_expires_at", models.DateTimeField(blank=True, null=True)),
                ("scopes", models.JSONField(blank=True, default=list)),
                (
                    "instagram_account_id",
                    models.CharField(blank=True, max_length=200),
                ),
                (
                    "instagram_username",
                    models.CharField(blank=True, max_length=200),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "owner",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pending_meta_pages",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "unique_together": {("owner", "page_id")},
            },
        ),
    ]
