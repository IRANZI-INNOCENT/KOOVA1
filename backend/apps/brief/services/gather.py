"""
Brief evidence gathering service.

Collects a snapshot of all available business data that the AI
reasoning layer needs to generate the morning brief.  Every number
in the evidence must come from stored records — the AI layer
interprets the evidence but never invents metrics.
"""

from __future__ import annotations

from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from apps.businesses.models import Business


def gather_evidence(business: Business) -> dict:
    """
    Return a dict of factual business evidence from the last 24 hours
    and overall state.  Each section is optional — if an app has no
    data the key is still present but empty so the AI knows it is
    unavailable rather than omitting it.
    """
    now = timezone.now()
    yesterday = now - timedelta(hours=24)

    evidence: dict = {
        "business": _business_context(business),
        "social": _social_evidence(business, yesterday),
        "content": _content_evidence(business, yesterday),
        "leads": _leads_evidence(business, yesterday),
        "commerce": _commerce_evidence(business),
        "actions": _actions_evidence(business, yesterday),
        "collected_at": now.isoformat(),
    }

    return evidence


def _business_context(business: Business) -> dict:
    ctx: dict = {
        "name": business.name,
        "industry": business.industry,
        "location": business.location,
    }

    # Goals
    goals = getattr(business, "goals", None)
    if goals and goals.primary_goal.strip():
        ctx["primary_goal"] = goals.primary_goal.strip()

    # Brand voice
    brand = getattr(business, "brand", None)
    if brand and brand.voice.strip():
        ctx["brand_voice"] = brand.voice.strip()

    return ctx


def _social_evidence(business: Business, since) -> dict:
    from apps.social.models import SocialAccount, SocialAction

    accounts = list(
        SocialAccount.objects.filter(business=business).values(
            "id", "platform", "account_name", "connection_status",
        )
    )

    connected_count = sum(
        1 for a in accounts if a["connection_status"] == "connected"
    )

    recent_actions = list(
        SocialAction.objects.filter(
            business=business,
            created_at__gte=since,
        )
        .order_by("-created_at")
        .values("action_type", "action_status", "intent", "result")[:20]
    )

    pending_approvals = SocialAction.objects.filter(
        business=business,
        requires_approval=True,
        approved_at__isnull=True,
        action_status="pending",
    ).count()

    return {
        "accounts": accounts,
        "connected_channels": connected_count,
        "total_channels": len(accounts),
        "recent_actions": recent_actions,
        "pending_approvals": pending_approvals,
    }


def _content_evidence(business: Business, since) -> dict:
    from apps.content.models import Content

    totals = (
        Content.objects.filter(business=business)
        .values("status")
        .annotate(count=Count("id"))
    )
    counts = {row["status"]: row["count"] for row in totals}

    recent = list(
        Content.objects.filter(
            business=business,
            created_at__gte=since,
        )
        .order_by("-created_at")
        .values("platform", "content_type", "status", "caption")[:10]
    )
    for item in recent:
        item["caption"] = (item.get("caption") or "")[:120]

    return {
        "drafts": counts.get("draft", 0),
        "approved": counts.get("approved", 0),
        "published": counts.get("published", 0),
        "rejected": counts.get("rejected", 0),
        "recent_pieces": recent,
    }


def _leads_evidence(business: Business, since) -> dict:
    from apps.leads.models import Lead

    totals = (
        Lead.objects.filter(business=business)
        .values("status")
        .annotate(count=Count("id"))
    )
    counts = {row["status"]: row["count"] for row in totals}
    total = sum(counts.values())

    new_since = Lead.objects.filter(
        business=business,
        created_at__gte=since,
    ).count()

    recent = list(
        Lead.objects.filter(business=business)
        .order_by("-created_at")
        .values("customer_name", "status", "source", "created_by_ai")[:5]
    )

    return {
        "total": total,
        "new_last_24h": new_since,
        "by_status": counts,
        "recent": recent,
    }


def _commerce_evidence(business: Business) -> dict:
    from apps.commerce.models import Order, Product

    totals = (
        Product.objects.filter(business=business)
        .values("status")
        .annotate(count=Count("id"))
    )
    counts = {row["status"]: row["count"] for row in totals}
    orders = Order.objects.filter(business=business)

    return {
        "total_products": sum(counts.values()),
        "active": counts.get("active", 0),
        "draft": counts.get("draft", 0),
        "orders": orders.count(),
        "new_orders": orders.filter(status=Order.Status.NEW).count(),
    }


def _actions_evidence(business: Business, since) -> dict:
    """What Kova did in the last 24h and what is still pending."""
    from apps.social.models import SocialAction

    completed = list(
        SocialAction.objects.filter(
            business=business,
            action_status="completed",
            executed_at__gte=since,
        )
        .order_by("-executed_at")
        .values("action_type", "intent", "result")[:10]
    )

    needs_approval = list(
        SocialAction.objects.filter(
            business=business,
            requires_approval=True,
            approved_at__isnull=True,
            action_status="pending",
        )
        .order_by("-created_at")
        .values("action_type", "intent")[:10]
    )

    return {
        "completed_last_24h": completed,
        "needs_approval": needs_approval,
    }
