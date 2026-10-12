"""
Whether a product already has social content in flight.

Autopilot and recommendations should not keep drafting the same product
while posts are still queued or fresh drafts are waiting.
"""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from apps.businesses.models import Business
from apps.content.models import Content
from apps.social.models import SocialPost


OPEN_POST_STATUSES = (
    SocialPost.PublishingStatus.PENDING,
    SocialPost.PublishingStatus.SCHEDULED,
    SocialPost.PublishingStatus.PUBLISHING,
)

OPEN_CONTENT_STATUSES = (
    Content.Status.DRAFT,
    Content.Status.APPROVED,
)


def product_ids_with_open_pipeline(
    business: Business,
    *,
    content_freshness_days: int = 14,
) -> set[int]:
    """Product ids that already have queued posts or unpublished content."""
    scheduled = set(
        SocialPost.objects.filter(
            content__business=business,
            content__product_id__isnull=False,
            publishing_status__in=OPEN_POST_STATUSES,
        ).values_list("content__product_id", flat=True)
    )
    cutoff = timezone.now() - timedelta(days=content_freshness_days)
    drafts = set(
        Content.objects.filter(
            business=business,
            product_id__isnull=False,
            status__in=OPEN_CONTENT_STATUSES,
            created_at__gte=cutoff,
        ).values_list("product_id", flat=True)
    )
    return scheduled | drafts


def product_has_open_pipeline(business: Business, product_id: int | None) -> bool:
    if product_id is None:
        return False
    return product_id in product_ids_with_open_pipeline(business)
