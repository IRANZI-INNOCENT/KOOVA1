from __future__ import annotations

from django.conf import settings
from django.db import models


class ProfessionalProfile(models.Model):
    """Personal professional brand for LinkedIn (user-scoped, not business)."""

    class OperatingMode(models.TextChoices):
        ASSIST = "assist", "Assist"
        APPROVAL = "approval", "Approval"

    class OnboardingPath(models.TextChoices):
        LINKEDIN = "linkedin", "LinkedIn only"
        BUSINESS = "business", "Business only"
        BOTH = "both", "Business and LinkedIn"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="professional_profile",
    )

    headline = models.CharField(max_length=220, blank=True)
    role_title = models.CharField(max_length=120, blank=True)
    industry = models.CharField(max_length=120, blank=True)
    tone_notes = models.TextField(
        blank=True,
        help_text="Voice, boundaries, and style preferences.",
    )

    operating_mode = models.CharField(
        max_length=20,
        choices=OperatingMode.choices,
        default=OperatingMode.APPROVAL,
    )

    onboarding_path = models.CharField(
        max_length=20,
        choices=OnboardingPath.choices,
        blank=True,
    )

    linkedin_setup_complete = models.BooleanField(default=False)

    profile_setup_complete = models.BooleanField(
        default=False,
        help_text="User finished LinkedIn profile basics and at least one pillar.",
    )

    topic_autopilot_enabled = models.BooleanField(
        default=False,
        help_text="Kova plans, drafts, and schedules a new topic week each calendar week.",
    )
    topic_autopilot_standing_topic = models.CharField(
        max_length=240,
        blank=True,
        help_text="Default theme when autopilot runs (optional).",
    )
    topic_autopilot_last_run_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Professional profile for {self.user_id}"


class ContentPillar(models.Model):
    profile = models.ForeignKey(
        ProfessionalProfile,
        on_delete=models.CASCADE,
        related_name="pillars",
    )
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    weight = models.PositiveSmallIntegerField(
        default=1,
        help_text="Relative emphasis when planning content.",
    )
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return self.name


class LinkedInConnection(models.Model):
    class Status(models.TextChoices):
        DISCONNECTED = "disconnected", "Disconnected"
        CONNECTED = "connected", "Connected"
        EXPIRED = "expired", "Expired"

    profile = models.OneToOneField(
        ProfessionalProfile,
        on_delete=models.CASCADE,
        related_name="linkedin_connection",
    )
    linkedin_member_id = models.CharField(max_length=64, blank=True)
    display_name = models.CharField(max_length=200, blank=True)
    access_token = models.TextField(blank=True)
    refresh_token = models.TextField(blank=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)
    connection_status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DISCONNECTED,
    )
    profile_snapshot = models.JSONField(
        default=dict,
        blank=True,
        help_text="Cached LinkedIn profile fields Kova fetched for the brain.",
    )
    profile_synced_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"LinkedIn connection for profile {self.profile_id}"


class ProfessionalProgram(models.Model):
    class ProgramType(models.TextChoices):
        TOPIC_WEEK = "topic_week", "Topic week"
        EVENT_MOMENT = "event_moment", "Event moment"

    class Status(models.TextChoices):
        PLANNING = "planning", "Planning"
        DRAFTING = "drafting", "Drafting"
        READY = "ready", "Ready"
        ARCHIVED = "archived", "Archived"

    profile = models.ForeignKey(
        ProfessionalProfile,
        on_delete=models.CASCADE,
        related_name="programs",
    )
    program_type = models.CharField(
        max_length=20,
        choices=ProgramType.choices,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PLANNING,
    )
    title = models.CharField(max_length=240, blank=True)

    input_data = models.JSONField(default=dict, blank=True)
    plan = models.JSONField(default=dict, blank=True)
    event_image = models.ImageField(
        upload_to="professional/events/",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title or f"{self.program_type} #{self.pk}"


class ProfessionalEventImage(models.Model):
    """Up to five photos for an event-moment program."""

    program = models.ForeignKey(
        ProfessionalProgram,
        on_delete=models.CASCADE,
        related_name="event_images",
    )
    image = models.ImageField(upload_to="professional/events/")
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self) -> str:
        return f"Event image {self.pk} program {self.program_id}"


class ProfessionalPost(models.Model):
    class PostRole(models.TextChoices):
        AUTHORITY = "authority", "Authority"
        TAKE = "take", "Take"
        STORY = "story", "Story"
        CONVERSATION = "conversation", "Conversation"
        EVENT = "event", "Event"

    class Format(models.TextChoices):
        TEXT = "text", "Text"
        CAROUSEL_OUTLINE = "carousel_outline", "Carousel outline"

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"
        SCHEDULED = "scheduled", "Scheduled"
        PUBLISHED = "published", "Published"
        COPIED = "copied", "Copied manually"

    profile = models.ForeignKey(
        ProfessionalProfile,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    program = models.ForeignKey(
        ProfessionalProgram,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="posts",
    )
    arc_index = models.PositiveSmallIntegerField(default=1)
    post_role = models.CharField(
        max_length=20,
        choices=PostRole.choices,
        default=PostRole.AUTHORITY,
    )
    format = models.CharField(
        max_length=24,
        choices=Format.choices,
        default=Format.TEXT,
    )
    title = models.CharField(max_length=200, blank=True)
    body = models.TextField(blank=True)
    carousel_slides = models.JSONField(default=list, blank=True)
    media_urls = models.JSONField(
        default=list,
        blank=True,
        help_text="Public URLs of images to publish with this post (event moments).",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    scheduled_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    publish_error = models.TextField(blank=True)
    linkedin_post_urn = models.CharField(max_length=120, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["scheduled_at", "arc_index", "id"]

    def __str__(self) -> str:
        return self.title or f"Post #{self.pk}"


class ProfessionalWeeklyBrief(models.Model):
    class Status(models.TextChoices):
        GENERATING = "generating", "Generating"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    profile = models.ForeignKey(
        ProfessionalProfile,
        on_delete=models.CASCADE,
        related_name="weekly_briefs",
    )
    week_start = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.GENERATING,
    )
    greeting = models.CharField(max_length=200, blank=True)
    sections = models.JSONField(default=dict, blank=True)
    evidence = models.JSONField(default=dict, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-week_start", "-created_at"]
        unique_together = [("profile", "week_start")]

    def __str__(self) -> str:
        return f"Weekly brief {self.week_start} profile {self.profile_id}"
