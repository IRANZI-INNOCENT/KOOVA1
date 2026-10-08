from django.conf import settings
from django.db import models


class Business(models.Model):
    """
Represent a business managed through Kova.

A Business belongs to the User who creates it. The owner remains
the authoritative account holder for business configuration,
Kova permissions, integrations, billing and other sensitive
business actions.
"""

    # The business owner is the user who initially creates the business.
    # settings.AUTH_USER_MODEL keeps this relationship compatible with
    # Kova's custom email-based User model.
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_businesses",
    )

    # Core business identity.
    name = models.CharField(
        max_length=200,
    )

    description = models.TextField(
        blank=True,
    )

    industry = models.CharField(
        max_length=100,
        blank=True,
    )

    location = models.CharField(
        max_length=200,
        blank=True,
    )

    # Customer-facing contact information.
    # These are separate from the owner's account credentials.
    email = models.EmailField(
        blank=True,
    )

    phone = models.CharField(
        max_length=30,
        blank=True,
    )

    # Track when the business was created and last modified.
    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        """Return the business name as its readable identifier."""
        return self.name