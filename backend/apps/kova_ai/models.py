from django.conf import settings
from django.db import models

from apps.businesses.models import Business


class KovaExchange(models.Model):
    """
    One Ask Kova turn.

    The owner sees the reply in the product. This row keeps the request,
    the reply, the model, and every tool Kova used so an admin can
    reconstruct what happened.
    """

    class Status(models.TextChoices):
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="kova_exchanges",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="kova_exchanges",
    )
    task = models.CharField(max_length=40)
    request_text = models.TextField()
    response_text = models.TextField(blank=True)
    model_name = models.CharField(max_length=150, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED,
    )
    error = models.TextField(blank=True)
    tool_calls = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.business.name} — {self.get_status_display()}"
