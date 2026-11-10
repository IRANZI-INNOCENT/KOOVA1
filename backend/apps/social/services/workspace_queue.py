"""Single queue of items that need owner attention."""

from __future__ import annotations

from typing import Any

from django.db.models import Q

from apps.commerce.models import Order
from apps.content.models import Content
from apps.social.models import SocialAction, SocialMessage, SocialPost


def build_workspace_queue(business) -> dict[str, Any]:
    drafts = list(
        Content.objects.filter(business=business, status=Content.Status.DRAFT)
        .order_by("-updated_at")[:15]
        .values("id", "platform", "caption", "updated_at", "created_by_ai")
    )
    ready = list(
        Content.objects.filter(business=business, status=Content.Status.APPROVED)
        .order_by("-updated_at")[:15]
        .values("id", "platform", "caption", "updated_at")
    )
    failed_posts = list(
        SocialPost.objects.filter(
            social_account__business=business,
            publishing_status=SocialPost.PublishingStatus.FAILED,
        )
        .select_related("content")
        .order_by("-updated_at")[:10]
    )
    failed = [
        {
            "id": row.pk,
            "content_id": row.content_id,
            "caption": (row.content.caption or "")[:160] if row.content_id else "",
            "error": (row.publishing_error or "")[:200],
            "platform": row.social_account.platform if row.social_account_id else "",
        }
        for row in failed_posts
    ]

    review_messages = list(
        SocialMessage.objects.filter(
            business=business,
            direction=SocialMessage.Direction.INBOUND,
        )
        .filter(Q(needs_review=True) | ~Q(draft_reply=""))
        .order_by("-created_at")[:20]
        .values(
            "id",
            "customer_name",
            "body",
            "draft_reply",
            "needs_review",
            "channel",
            "intent",
            "created_at",
        )
    )

    open_orders = list(
        Order.objects.filter(business=business)
        .exclude(
            status__in=[
                Order.Status.DELIVERED,
                Order.Status.CANCELLED,
            ]
        )
        .select_related("product")
        .order_by("-created_at")[:15]
    )
    orders = [
        {
            "id": row.pk,
            "customer_name": row.customer_name,
            "status": row.status,
            "product_name": row.product.name if row.product_id else "",
            "created_at": row.created_at.isoformat(),
        }
        for row in open_orders
    ]

    pending_actions = list(
        SocialAction.objects.filter(
            business=business,
            action_status=SocialAction.ActionStatus.PENDING,
        )
        .order_by("-created_at")[:20]
        .values(
            "id",
            "action_type",
            "intent",
            "target_type",
            "target_id",
            "requires_approval",
            "created_at",
        )
    )

    counts = {
        "draft_posts": len(drafts),
        "ready_to_publish": len(ready),
        "messages_review": len(review_messages),
        "failed_posts": len(failed),
        "open_orders": len(orders),
        "pending_actions": len(pending_actions),
        "total": (
            len(drafts)
            + len(ready)
            + len(review_messages)
            + len(failed)
            + len(orders)
            + len(pending_actions)
        ),
    }

    return {
        "counts": counts,
        "draft_posts": drafts,
        "ready_to_publish": ready,
        "messages_review": review_messages,
        "failed_posts": failed,
        "open_orders": orders,
        "pending_actions": pending_actions,
    }
