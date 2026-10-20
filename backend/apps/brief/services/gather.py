"""
Brief evidence gathering service.

Collects a snapshot of all available business data that the AI
reasoning layer needs to generate the morning brief or weekly report.
Every number must come from stored records — the AI interprets
evidence but never invents metrics.
"""

from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Count, Q, Sum
from django.utils import timezone

from apps.businesses.models import Business

NAIROBI = ZoneInfo("Africa/Nairobi")


def gather_evidence(business: Business) -> dict:
    """Factual snapshot for the last ~24 hours plus current state."""
    now = timezone.now()
    since = now - timedelta(hours=24)

    return {
        "period": "last_24_hours",
        "business": _business_context(business),
        "social": _social_evidence(business, since),
        "publishing": _publishing_evidence(business, since),
        "cadence": _cadence_evidence(business),
        "content": _content_evidence(business, since),
        "inbox": _inbox_evidence(business, since),
        "leads": _leads_evidence(business, since),
        "commerce": _commerce_evidence(business, since),
        "actions": _actions_evidence(business, since),
        "collected_at": now.isoformat(),
    }


def current_week_start(on: date | None = None) -> date:
    day = on or timezone.now().astimezone(NAIROBI).date()
    return day - timedelta(days=day.weekday())


def gather_weekly_evidence(business: Business, *, week_start: date | None = None) -> dict:
    """Factual snapshot for a Nairobi calendar week (Mon–Sun)."""
    now = timezone.now()
    if week_start is None:
        week_start = current_week_start()
    week_end = week_start + timedelta(days=7)
    start_dt = timezone.make_aware(datetime.combine(week_start, time.min), NAIROBI)
    end_dt = timezone.make_aware(datetime.combine(week_end, time.min), NAIROBI)

    return {
        "period": "calendar_week",
        "week_start": week_start.isoformat(),
        "week_end": (week_end - timedelta(days=1)).isoformat(),
        "business": _business_context(business),
        "social": _social_evidence(business, start_dt, until=end_dt),
        "publishing": _publishing_evidence(business, start_dt, until=end_dt),
        "cadence": _cadence_evidence(business),
        "content": _content_evidence(business, start_dt, until=end_dt),
        "inbox": _inbox_evidence(business, start_dt, until=end_dt),
        "leads": _leads_evidence(business, start_dt, until=end_dt, new_key="new_this_week"),
        "commerce": _commerce_evidence(business, start_dt, until=end_dt),
        "actions": _actions_evidence(
            business,
            start_dt,
            until=end_dt,
            completed_key="completed_this_week",
        ),
        "daily_briefs": _daily_brief_summaries(business, week_start, week_end),
        "collected_at": now.isoformat(),
    }


def _manager_display_name(business: Business) -> str:
    owner = getattr(business, "owner", None)
    if owner is None:
        return ""
    first = (getattr(owner, "first_name", None) or "").strip()
    last = (getattr(owner, "last_name", None) or "").strip()
    full = f"{first} {last}".strip()
    if full:
        return full
    email = (getattr(owner, "email", None) or "").strip()
    if email and "@" in email:
        return email.split("@", 1)[0]
    return ""


def _related_or_none(business: Business, attr: str):
    try:
        return getattr(business, attr)
    except Exception:
        return None


def _business_context(business: Business) -> dict:
    manager_name = _manager_display_name(business)
    owner = getattr(business, "owner", None)
    first_name = (getattr(owner, "first_name", None) or "").strip() if owner else ""
    ctx: dict = {
        "name": business.name,
        "industry": business.industry,
        "location": business.location,
        "report_to": {
            "role": "business_manager",
            "name": manager_name or business.name,
            "first_name": first_name,
            "address_as": first_name or manager_name or "Manager",
        },
        "tone": (
            "Write as Kova, the business's social and commerce teammate, "
            "reporting personally to this manager — not as a generic dashboard."
        ),
    }

    goals = _related_or_none(business, "goals")
    if goals and getattr(goals, "primary_goal", "").strip():
        ctx["primary_goal"] = goals.primary_goal.strip()
        if getattr(goals, "secondary_goals", None) and str(goals.secondary_goals).strip():
            ctx["secondary_goals"] = str(goals.secondary_goals).strip()[:400]

    brand = _related_or_none(business, "brand")
    if brand:
        if getattr(brand, "voice", "").strip():
            ctx["brand_voice"] = brand.voice.strip()
        if getattr(brand, "tone", "").strip():
            ctx["brand_tone"] = brand.tone.strip()[:300]

    profile = _related_or_none(business, "profile")
    if profile:
        if getattr(profile, "mission", "").strip():
            ctx["mission"] = profile.mission.strip()[:400]
        if getattr(profile, "value_proposition", "").strip():
            ctx["value_proposition"] = profile.value_proposition.strip()[:400]
        if getattr(profile, "target_market", "").strip():
            ctx["target_market"] = profile.target_market.strip()[:400]

    audience = _related_or_none(business, "audience")
    if audience and getattr(audience, "primary_audience", "").strip():
        ctx["primary_audience"] = audience.primary_audience.strip()[:400]

    policy = _related_or_none(business, "policy")
    if policy and getattr(policy, "social_operating_mode", None):
        ctx["operating_mode"] = policy.social_operating_mode

    return ctx


def _social_evidence(business: Business, since, *, until=None) -> dict:
    from apps.social.models import SocialAccount, SocialAction

    accounts = list(
        SocialAccount.objects.filter(business=business).values(
            "id", "platform", "account_name", "connection_status",
        )
    )

    connected_count = sum(
        1 for a in accounts if a["connection_status"] == "connected"
    )

    action_filter = Q(business=business, created_at__gte=since)
    if until is not None:
        action_filter &= Q(created_at__lt=until)

    recent_actions = list(
        SocialAction.objects.filter(action_filter)
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


def _publishing_evidence(business: Business, since, *, until=None) -> dict:
    from apps.social.models import SocialPost

    posts = SocialPost.objects.filter(social_account__business=business)
    window = Q(published_at__gte=since) | Q(
        published_at__isnull=True,
        scheduled_at__gte=since,
    )
    if until is not None:
        window &= Q(published_at__lt=until) | Q(
            published_at__isnull=True,
            scheduled_at__lt=until,
        )

    in_window = posts.filter(window)
    published = in_window.filter(
        publishing_status=SocialPost.PublishingStatus.PUBLISHED,
    )
    metrics = published.aggregate(
        reach=Sum("reach"),
        impressions=Sum("impressions"),
        likes=Sum("likes"),
        comments=Sum("comments_count"),
        shares=Sum("shares"),
        clicks=Sum("clicks"),
    )

    by_platform = list(
        published.values("social_account__platform")
        .annotate(count=Count("id"))
        .order_by()
    )

    upcoming = list(
        posts.filter(
            publishing_status=SocialPost.PublishingStatus.SCHEDULED,
            scheduled_at__gte=timezone.now(),
        )
        .order_by("scheduled_at")
        .values(
            "scheduled_at",
            "social_account__platform",
            "content__content_type",
        )[:8]
    )
    for row in upcoming:
        when = row.get("scheduled_at")
        row["scheduled_at"] = when.isoformat() if when else None

    failed = posts.filter(
        publishing_status=SocialPost.PublishingStatus.FAILED,
        updated_at__gte=since,
    ).count()

    return {
        "published_in_period": published.count(),
        "scheduled_upcoming": len(upcoming),
        "failed_recent": failed,
        "by_platform": [
            {
                "platform": row["social_account__platform"],
                "count": row["count"],
            }
            for row in by_platform
        ],
        "metrics": {
            "reach": metrics["reach"] or 0,
            "impressions": metrics["impressions"] or 0,
            "likes": metrics["likes"] or 0,
            "comments": metrics["comments"] or 0,
            "shares": metrics["shares"] or 0,
            "clicks": metrics["clicks"] or 0,
        },
        "upcoming_posts": upcoming,
    }


def _cadence_evidence(business: Business) -> dict:
    try:
        from apps.social.services.posting_limits import (
            get_cadence_limits,
            remaining_slots,
        )
    except Exception:
        return {}

    limits = get_cadence_limits(business)
    return {
        "facebook_max_per_day": limits.facebook_max_per_day,
        "facebook_max_per_week": limits.facebook_max_per_week,
        "instagram_max_per_day": limits.instagram_max_per_day,
        "instagram_max_per_week": limits.instagram_max_per_week,
        "min_hours_between": limits.min_hours_between,
        "facebook_slots_remaining_today": remaining_slots(business, "facebook"),
        "instagram_slots_remaining_today": remaining_slots(business, "instagram"),
    }


def _content_evidence(business: Business, since, *, until=None) -> dict:
    from apps.content.models import Content

    totals = (
        Content.objects.filter(business=business)
        .values("status")
        .annotate(count=Count("id"))
    )
    counts = {row["status"]: row["count"] for row in totals}

    recent_q = Q(business=business, created_at__gte=since)
    if until is not None:
        recent_q &= Q(created_at__lt=until)

    recent = list(
        Content.objects.filter(recent_q)
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


def _inbox_evidence(business: Business, since, *, until=None) -> dict:
    from apps.social.models import SocialMessage

    messages = SocialMessage.objects.filter(business=business)
    period = Q(created_at__gte=since)
    if until is not None:
        period &= Q(created_at__lt=until)

    inbound = messages.filter(period, direction=SocialMessage.Direction.INBOUND)
    return {
        "inbound_in_period": inbound.count(),
        "buying_in_period": inbound.filter(intent=SocialMessage.Intent.BUYING).count(),
        "complaints_in_period": inbound.filter(
            intent=SocialMessage.Intent.COMPLAINT,
        ).count(),
        "needs_review": messages.filter(needs_review=True).count(),
    }


def _leads_evidence(
    business: Business,
    since,
    *,
    until=None,
    new_key: str = "new_last_24h",
) -> dict:
    from apps.leads.models import Lead

    totals = (
        Lead.objects.filter(business=business)
        .values("status")
        .annotate(count=Count("id"))
    )
    counts = {row["status"]: row["count"] for row in totals}
    total = sum(counts.values())

    new_q = Q(business=business, created_at__gte=since)
    if until is not None:
        new_q &= Q(created_at__lt=until)
    new_since = Lead.objects.filter(new_q).count()

    recent = list(
        Lead.objects.filter(business=business)
        .order_by("-created_at")
        .values("customer_name", "status", "source", "created_by_ai")[:5]
    )

    return {
        "total": total,
        new_key: new_since,
        "by_status": counts,
        "recent": recent,
    }


def _commerce_evidence(business: Business, since=None, *, until=None) -> dict:
    from apps.commerce.models import Order, Product

    totals = (
        Product.objects.filter(business=business)
        .values("status")
        .annotate(count=Count("id"))
    )
    counts = {row["status"]: row["count"] for row in totals}
    orders = Order.objects.filter(business=business)

    period_orders = orders
    if since is not None:
        period_orders = period_orders.filter(created_at__gte=since)
    if until is not None:
        period_orders = period_orders.filter(created_at__lt=until)

    return {
        "total_products": sum(counts.values()),
        "active": counts.get("active", 0),
        "draft": counts.get("draft", 0),
        "orders_total": orders.count(),
        "orders_new": orders.filter(status=Order.Status.NEW).count(),
        "orders_in_period": period_orders.count(),
        "orders_fulfilled": orders.filter(status=Order.Status.FULFILLED).count(),
    }


def _actions_evidence(
    business: Business,
    since,
    *,
    until=None,
    completed_key: str = "completed_last_24h",
) -> dict:
    from apps.social.models import SocialAction

    done_q = Q(
        business=business,
        action_status="completed",
        executed_at__gte=since,
    )
    if until is not None:
        done_q &= Q(executed_at__lt=until)

    completed = list(
        SocialAction.objects.filter(done_q)
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
        completed_key: completed,
        "needs_approval": needs_approval,
    }


def _daily_brief_summaries(business: Business, week_start, week_end) -> list[dict]:
    from apps.brief.models import MorningBrief

    rows = (
        MorningBrief.objects.filter(
            business=business,
            date__gte=week_start,
            date__lt=week_end,
            status=MorningBrief.Status.READY,
        )
        .order_by("date")
        .values("date", "greeting", "sections")
    )
    out = []
    for row in rows:
        sections = row.get("sections") or {}
        pulse = sections.get("pulse") or {}
        out.append(
            {
                "date": row["date"].isoformat(),
                "greeting": row.get("greeting") or "",
                "pulse": pulse.get("summary") or "",
            }
        )
    return out
