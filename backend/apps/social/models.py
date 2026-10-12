"""
Kova Social models.

Socials is the execution arm of the Kova Brain for a business's public
online presence.  These models store connected social accounts, track
every published post across platforms, and audit every action Kova
takes so nothing is invisible.

The models are platform-agnostic.  Platform-specific behaviour lives
in channel adapters (apps.social.adapters).
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models

from apps.businesses.models import Business


# ---------------------------------------------------------------------------
# Social account — a connected platform account
# ---------------------------------------------------------------------------

class SocialAccount(models.Model):
    """
    A social platform account connected by a business owner.

    One business can have multiple connected accounts (e.g. a Facebook
    Page and the linked Instagram Professional account).  Each account
    stores its own OAuth token, granted scopes, and connection health.
    """

    class Platform(models.TextChoices):
        FACEBOOK_PAGE = "facebook_page", "Facebook Page"
        INSTAGRAM = "instagram", "Instagram Professional"

    class ConnectionStatus(models.TextChoices):
        CONNECTED = "connected", "Connected"
        EXPIRED = "expired", "Token expired"
        REVOKED = "revoked", "Access revoked"
        ERROR = "error", "Connection error"

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="social_accounts",
    )

    platform = models.CharField(
        max_length=30,
        choices=Platform.choices,
    )

    platform_account_id = models.CharField(
        max_length=200,
        help_text="The platform's unique identifier for this account.",
    )

    account_name = models.CharField(
        max_length=200,
        blank=True,
    )

    account_username = models.CharField(
        max_length=200,
        blank=True,
    )

    profile_picture_url = models.URLField(
        max_length=2048,
        blank=True,
    )

    access_token = models.TextField(
        blank=True,
        help_text="Encrypted OAuth access token.",
    )

    token_expires_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    scopes = models.JSONField(
        default=list,
        blank=True,
        help_text="List of granted API scopes.",
    )

    connection_status = models.CharField(
        max_length=20,
        choices=ConnectionStatus.choices,
        default=ConnectionStatus.CONNECTED,
    )

    connection_error = models.TextField(
        blank=True,
        help_text="Details when connection_status is error.",
    )

    connected_at = models.DateTimeField(auto_now_add=True)
    last_verified_at = models.DateTimeField(null=True, blank=True)

    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Platform-specific profile data (follower count, category, etc.).",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-connected_at"]
        unique_together = [("business", "platform", "platform_account_id")]

    def __str__(self):
        return f"{self.get_platform_display()} — {self.account_name or self.platform_account_id}"

    @property
    def is_healthy(self) -> bool:
        return self.connection_status == self.ConnectionStatus.CONNECTED


class PendingMetaPageGrant(models.Model):
    """
    Facebook Page from Meta Login that is not yet tied to a Business Brain.

    Each operational brain owns at most one Facebook Page (and its linked
    Instagram). Extra Pages stay here until the owner assigns them to a new
    or existing business.
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="pending_meta_pages",
    )
    page_id = models.CharField(max_length=200)
    page_name = models.CharField(max_length=200, blank=True)
    page_access_token = models.TextField()
    token_expires_at = models.DateTimeField(null=True, blank=True)
    scopes = models.JSONField(default=list, blank=True)
    instagram_account_id = models.CharField(max_length=200, blank=True)
    instagram_username = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = [("owner", "page_id")]

    def __str__(self):
        return f"Pending Page — {self.page_name or self.page_id}"


# ---------------------------------------------------------------------------
# Social post — publishing lifecycle for a content asset
# ---------------------------------------------------------------------------

class SocialPost(models.Model):
    """
    Track the publishing lifecycle of a Content record on a connected
    social account.

    One Content may produce multiple SocialPosts when cross-posted to
    different accounts.  Each SocialPost records the platform response,
    retry history, and an idempotency key to prevent duplicates.
    """

    class PublishingStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        SCHEDULED = "scheduled", "Scheduled"
        PUBLISHING = "publishing", "Publishing"
        PUBLISHED = "published", "Published"
        FAILED = "failed", "Failed"

    content = models.ForeignKey(
        "content.Content",
        on_delete=models.CASCADE,
        related_name="social_posts",
    )

    social_account = models.ForeignKey(
        SocialAccount,
        on_delete=models.CASCADE,
        related_name="posts",
    )

    external_post_id = models.CharField(
        max_length=200,
        blank=True,
        help_text="The platform's ID for the published post.",
    )

    publishing_status = models.CharField(
        max_length=20,
        choices=PublishingStatus.choices,
        default=PublishingStatus.PENDING,
    )

    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the post should be published.",
    )

    published_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    publishing_error = models.TextField(
        blank=True,
    )

    publishing_attempts = models.PositiveIntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)

    idempotency_key = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        help_text="Prevents duplicate publishing on retry.",
    )

    platform_response = models.JSONField(
        default=dict,
        blank=True,
        help_text="Raw response from the platform API.",
    )

    reach = models.PositiveIntegerField(default=0)
    impressions = models.PositiveIntegerField(default=0)
    likes = models.PositiveIntegerField(default=0)
    comments_count = models.PositiveIntegerField(default=0)
    shares = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)
    metrics_updated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.social_account.get_platform_display()} — "
            f"{self.get_publishing_status_display()}"
        )


# ---------------------------------------------------------------------------
# Social action — audit log
# ---------------------------------------------------------------------------

class SocialAction(models.Model):
    """
    Persistent record of every action Kova performs on social platforms.

    Every external action records what Kova intended to do, what it
    attempted, the platform response, and whether the action succeeded.
    This is the verification and learning layer.
    """

    class ActionType(models.TextChoices):
        DRAFT = "draft", "Draft content"
        SCHEDULE = "schedule", "Schedule post"
        PUBLISH = "publish", "Publish post"
        REPLY = "reply", "Reply to comment or message"
        CLASSIFY = "classify", "Classify intent"
        CAPTURE_LEAD = "capture_lead", "Capture lead"
        REFRESH_TOKEN = "refresh_token", "Refresh token"
        VERIFY_CONNECTION = "verify", "Verify connection"
        FETCH_METRICS = "fetch_metrics", "Fetch metrics"

    class ActionStatus(models.TextChoices):
        PENDING = "pending", "Pending approval"
        APPROVED = "approved", "Approved"
        EXECUTING = "executing", "Executing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        REJECTED = "rejected", "Rejected by owner"

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="social_actions",
    )

    social_account = models.ForeignKey(
        SocialAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="actions",
    )

    action_type = models.CharField(
        max_length=30,
        choices=ActionType.choices,
    )

    action_status = models.CharField(
        max_length=20,
        choices=ActionStatus.choices,
        default=ActionStatus.PENDING,
    )

    intent = models.TextField(
        help_text="What Kova intended to do.",
    )

    result = models.TextField(
        blank=True,
        help_text="What actually happened.",
    )

    platform_response = models.JSONField(
        default=dict,
        blank=True,
    )

    requires_approval = models.BooleanField(default=True)

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_social_actions",
    )

    approved_at = models.DateTimeField(null=True, blank=True)
    executed_at = models.DateTimeField(null=True, blank=True)

    target_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="What was acted on: post, comment, message, account.",
    )

    target_id = models.CharField(
        max_length=200,
        blank=True,
        help_text="ID of the target object.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_action_type_display()} — {self.get_action_status_display()}"


class SocialMessage(models.Model):
    """
    A customer message or comment, and the reply Kova or the owner sent.

    Messages arrive from a Meta webhook or are logged by the owner.
    A buying message also creates a lead.
    """

    class Channel(models.TextChoices):
        INSTAGRAM = "instagram", "Instagram"
        FACEBOOK = "facebook", "Facebook"
        WHATSAPP = "whatsapp", "WhatsApp"
        WEB = "web", "Web"

    class Direction(models.TextChoices):
        INBOUND = "in", "Inbound"
        OUTBOUND = "out", "Outbound"

    class Intent(models.TextChoices):
        QUESTION = "question", "Question"
        BUYING = "buying", "Buying"
        COMPLAINT = "complaint", "Complaint"
        COMPLIMENT = "compliment", "Compliment"
        SPAM = "spam", "Spam"
        OTHER = "other", "Other"

    class Kind(models.TextChoices):
        MESSAGE = "message", "Direct message"
        COMMENT = "comment", "Comment"

    class Delivery(models.TextChoices):
        RECEIVED = "received", "Received"
        SENT = "sent", "Sent to the platform"
        SAVED = "saved", "Saved in Kova"
        FAILED = "failed", "The platform rejected it"

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="social_messages",
    )
    social_account = models.ForeignKey(
        SocialAccount,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="messages",
    )
    channel = models.CharField(max_length=20, choices=Channel.choices)
    kind = models.CharField(
        max_length=20,
        choices=Kind.choices,
        default=Kind.MESSAGE,
    )
    reply_target_id = models.CharField(
        max_length=200,
        blank=True,
        help_text="Comment id or sender id used when the reply is sent.",
    )
    draft_reply = models.TextField(blank=True)
    in_reply_to = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replies",
    )
    delivery_status = models.CharField(
        max_length=20,
        choices=Delivery.choices,
        default=Delivery.RECEIVED,
    )
    direction = models.CharField(
        max_length=8,
        choices=Direction.choices,
        default=Direction.INBOUND,
    )
    customer_name = models.CharField(max_length=200, blank=True)
    body = models.TextField()
    external_id = models.CharField(max_length=200, blank=True)
    intent = models.CharField(
        max_length=20,
        choices=Intent.choices,
        default=Intent.OTHER,
    )
    confidence = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
    )
    needs_review = models.BooleanField(
        default=False,
        help_text="Complaints, low confidence, and unknown facts wait for the owner.",
    )
    lead = models.ForeignKey(
        "leads.Lead",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="messages",
    )
    reply_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_channel_display()} {self.direction}: {self.body[:40]}"


class SocialLesson(models.Model):
    """
    A verified outcome or an observation Kova can use next time.

    A published post is verified only after the platform accepts it.
    A failed send is an observation, not a success.
    """

    class Kind(models.TextChoices):
        VERIFIED = "verified", "Verified"
        OBSERVATION = "observation", "Observation"

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="social_lessons",
    )
    kind = models.CharField(max_length=20, choices=Kind.choices)
    summary = models.TextField()
    evidence = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.summary[:80]


class AutopilotShift(models.Model):
    """One stretch of work after the owner hands Kova the business."""

    class Status(models.TextChoices):
        RUNNING = "running", "Running"
        FINISHED = "finished", "Finished"
        FAILED = "failed", "Failed"

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="autopilot_shifts",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.RUNNING,
    )
    briefing = models.TextField(blank=True)
    plan = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.business.name} autopilot {self.started_at:%Y-%m-%d %H:%M}"


class AutopilotEvent(models.Model):
    """One thing Kova did, or tried to do, during a shift."""

    class Status(models.TextChoices):
        DONE = "done", "Done"
        FAILED = "failed", "Failed"

    shift = models.ForeignKey(
        AutopilotShift,
        on_delete=models.CASCADE,
        related_name="events",
    )
    title = models.CharField(max_length=200)
    detail = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DONE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return self.title
