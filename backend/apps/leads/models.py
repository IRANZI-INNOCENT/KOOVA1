"""
Kova Lead models.

A Lead represents a potential customer that Kova has identified through
social engagement, conversations, or manual entry. Leads are a core
business asset that feeds into the sales pipeline.

The AI creates leads automatically when it detects buying interest
in conversations. The business owner can also create leads manually.
"""

from django.db import models

from apps.businesses.models import Business


class Lead(models.Model):
    """
    A business lead tracked by Kova.

    Leads are created through the CreateLeadTool when the AI detects
    customer interest, or manually by the business owner.
    """

    class Status(models.TextChoices):
        NEW = "new", "New"
        CONTACTED = "contacted", "Contacted"
        QUALIFIED = "qualified", "Qualified"
        CONVERTED = "converted", "Converted"
        LOST = "lost", "Lost"

    class Source(models.TextChoices):
        INSTAGRAM = "instagram", "Instagram"
        FACEBOOK = "facebook", "Facebook"
        WHATSAPP = "whatsapp", "WhatsApp"
        TIKTOK = "tiktok", "TikTok"
        WEB = "web", "Web"
        MANUAL = "manual", "Manual"
        OTHER = "other", "Other"

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="leads",
    )

    customer_name = models.CharField(
        max_length=200,
        blank=True,
    )

    customer_id = models.CharField(
        max_length=200,
        blank=True,
        help_text="External customer identifier from social platform.",
    )

    conversation_id = models.CharField(
        max_length=200,
        blank=True,
        help_text="Reference to the conversation where interest was detected.",
    )

    source = models.CharField(
        max_length=30,
        choices=Source.choices,
    )

    interest = models.TextField(
        help_text="What the customer expressed interest in.",
    )

    notes = models.TextField(
        blank=True,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
    )

    created_by_ai = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        name = self.customer_name or self.customer_id or "Unknown"
        return f"Lead: {name} — {self.source} ({self.status})"
