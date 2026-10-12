import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ProfessionalProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("headline", models.CharField(blank=True, max_length=220)),
                ("role_title", models.CharField(blank=True, max_length=120)),
                ("industry", models.CharField(blank=True, max_length=120)),
                ("tone_notes", models.TextField(blank=True, help_text="Voice, boundaries, and style preferences.")),
                (
                    "operating_mode",
                    models.CharField(
                        choices=[("assist", "Assist"), ("approval", "Approval")],
                        default="approval",
                        max_length=20,
                    ),
                ),
                (
                    "onboarding_path",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("linkedin", "LinkedIn only"),
                            ("business", "Business only"),
                            ("both", "Business and LinkedIn"),
                        ],
                        max_length=20,
                    ),
                ),
                ("linkedin_setup_complete", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="professional_profile",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ProfessionalProgram",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "program_type",
                    models.CharField(
                        choices=[("topic_week", "Topic week"), ("event_moment", "Event moment")],
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("planning", "Planning"),
                            ("drafting", "Drafting"),
                            ("ready", "Ready"),
                            ("archived", "Archived"),
                        ],
                        default="planning",
                        max_length=20,
                    ),
                ),
                ("title", models.CharField(blank=True, max_length=240)),
                ("input_data", models.JSONField(blank=True, default=dict)),
                ("plan", models.JSONField(blank=True, default=dict)),
                ("event_image", models.ImageField(blank=True, null=True, upload_to="professional/events/")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="programs",
                        to="professional.professionalprofile",
                    ),
                ),
            ],
            options={"ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="ProfessionalPost",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("arc_index", models.PositiveSmallIntegerField(default=1)),
                (
                    "post_role",
                    models.CharField(
                        choices=[
                            ("authority", "Authority"),
                            ("take", "Take"),
                            ("story", "Story"),
                            ("conversation", "Conversation"),
                            ("event", "Event"),
                        ],
                        default="authority",
                        max_length=20,
                    ),
                ),
                (
                    "format",
                    models.CharField(
                        choices=[("text", "Text"), ("carousel_outline", "Carousel outline")],
                        default="text",
                        max_length=24,
                    ),
                ),
                ("title", models.CharField(blank=True, max_length=200)),
                ("body", models.TextField(blank=True)),
                ("carousel_slides", models.JSONField(blank=True, default=list)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("draft", "Draft"),
                            ("approved", "Approved"),
                            ("scheduled", "Scheduled"),
                            ("published", "Published"),
                            ("copied", "Copied manually"),
                        ],
                        default="draft",
                        max_length=20,
                    ),
                ),
                ("scheduled_at", models.DateTimeField(blank=True, null=True)),
                ("published_at", models.DateTimeField(blank=True, null=True)),
                ("publish_error", models.TextField(blank=True)),
                ("linkedin_post_urn", models.CharField(blank=True, max_length=120)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="posts",
                        to="professional.professionalprofile",
                    ),
                ),
                (
                    "program",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="posts",
                        to="professional.professionalprogram",
                    ),
                ),
            ],
            options={"ordering": ["scheduled_at", "arc_index", "id"]},
        ),
        migrations.CreateModel(
            name="LinkedInConnection",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("linkedin_member_id", models.CharField(blank=True, max_length=64)),
                ("display_name", models.CharField(blank=True, max_length=200)),
                ("access_token", models.TextField(blank=True)),
                ("refresh_token", models.TextField(blank=True)),
                ("token_expires_at", models.DateTimeField(blank=True, null=True)),
                (
                    "connection_status",
                    models.CharField(
                        choices=[
                            ("disconnected", "Disconnected"),
                            ("connected", "Connected"),
                            ("expired", "Expired"),
                        ],
                        default="disconnected",
                        max_length=20,
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "profile",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="linkedin_connection",
                        to="professional.professionalprofile",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="ContentPillar",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("description", models.TextField(blank=True)),
                ("weight", models.PositiveSmallIntegerField(default=1, help_text="Relative emphasis when planning content.")),
                ("sort_order", models.PositiveSmallIntegerField(default=0)),
                (
                    "profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pillars",
                        to="professional.professionalprofile",
                    ),
                ),
            ],
            options={"ordering": ["sort_order", "id"]},
        ),
        migrations.CreateModel(
            name="ProfessionalWeeklyBrief",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("week_start", models.DateField()),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("generating", "Generating"),
                            ("ready", "Ready"),
                            ("failed", "Failed"),
                        ],
                        default="generating",
                        max_length=20,
                    ),
                ),
                ("greeting", models.CharField(blank=True, max_length=200)),
                ("sections", models.JSONField(blank=True, default=dict)),
                ("evidence", models.JSONField(blank=True, default=dict)),
                ("error_message", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "profile",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="weekly_briefs",
                        to="professional.professionalprofile",
                    ),
                ),
            ],
            options={
                "ordering": ["-week_start", "-created_at"],
                "unique_together": {("profile", "week_start")},
            },
        ),
    ]
