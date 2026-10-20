import secrets

from django.conf import settings
from django.db import models


def _prefs_token() -> str:
    return secrets.token_urlsafe(32)


class EmailPreference(models.Model):
    """Per-user opt-in flags for transactional email categories."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_preference",
    )
    account = models.BooleanField(default=True)
    alerts = models.BooleanField(default=True)
    commerce = models.BooleanField(default=True)
    reports = models.BooleanField(default=True)
    token = models.CharField(max_length=64, unique=True, default=_prefs_token, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Email prefs for {self.user_id}"


class EmailLog(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        SKIPPED = "skipped", "Skipped"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="email_logs",
    )
    business = models.ForeignKey(
        "businesses.Business",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_logs",
    )
    kind = models.CharField(max_length=64, db_index=True)
    category = models.CharField(max_length=32, blank=True)
    subject = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.QUEUED,
    )
    resend_id = models.CharField(max_length=120, blank=True)
    error_message = models.TextField(blank=True)
    meta = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.kind} → {self.user_id} ({self.status})"
