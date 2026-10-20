"""
Ask Kova when each drafted post should go out, then clamp to
BusinessPolicy posting cadence (Meta-aligned day/week/gap limits).
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.utils import timezone

from apps.businesses.models import Business
from apps.content.models import Content
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService
from apps.social.services.posting_limits import get_cadence_limits, plan_publish_times
from apps.social.services.publish import enqueue, parse_when

NAIROBI = ZoneInfo("Africa/Nairobi")


def schedule_posts(
    business: Business,
    content_ids: list[int],
    *,
    autopilot: bool = False,
) -> list[dict]:
    """Place each post on the calendar at a cadence-safe time."""
    contents = list(
        Content.objects.filter(business=business, pk__in=content_ids)
        .exclude(status=Content.Status.REJECTED)
        .select_related("product")
    )
    if not contents:
        raise ValueError("There is no content to schedule.")

    if autopilot:
        from apps.social.services.publish import publish_autopilot_batch

        return publish_autopilot_batch(business, content_ids)

    preferred: dict[int, datetime] = {}
    try:
        plan = _ask_for_times(business, contents)
    except OpenRouterError:
        plan = []

    now = timezone.now()
    by_id = {content.id: content for content in contents}

    for item in plan:
        try:
            content_id = int(item.get("content_id"))
        except (TypeError, ValueError):
            continue
        if content_id not in by_id:
            continue
        when = _future_time(parse_when(item.get("scheduled_at")), now)
        if when is None:
            continue
        preferred[content_id] = when

    # Prefer AI order when present; otherwise content id order.
    ordered = sorted(
        contents,
        key=lambda c: (preferred[c.id].timestamp() if c.id in preferred else 1e20, c.id),
    )
    planned = plan_publish_times(
        business,
        ordered,
        now=now,
        preferred=preferred or None,
    )
    if not planned:
        raise ValueError(
            "Posting limits are full for your Facebook/Instagram cadence. "
            "Raise the limits under Settings → Business policy, or wait "
            "for the next open slot."
        )

    scheduled: list[dict] = []
    for content, when in planned:
        reason = ""
        if content.id in preferred:
            reason = "Placed within your posting limits."
        else:
            reason = "Spread to respect your Facebook/Instagram posting limits."
        enqueue(content, when)
        scheduled.append(_scheduled_row(content, when, reason))
    return scheduled


def _scheduled_row(content: Content, when: datetime, reason) -> dict:
    return {
        "content_id": content.id,
        "platform": content.platform,
        "content_type": content.content_type,
        "product_name": content.product.name if content.product_id else "",
        "scheduled_at": when.isoformat(),
        "reason": str(reason or "")[:240],
    }


def _future_time(when: datetime | None, now: datetime) -> datetime | None:
    if when is None:
        return None
    if timezone.is_naive(when):
        when = timezone.make_aware(when)
    if when <= now:
        return now + timedelta(minutes=15)
    return when


def _ask_for_times(
    business: Business,
    contents: list[Content],
) -> list[dict]:
    now = datetime.now(NAIROBI)
    limits = get_cadence_limits(business)
    pieces = [
        {
            "content_id": content.id,
            "product": content.product.name if content.product_id else business.name,
            "platform": content.platform,
            "content_type": content.content_type,
            "caption": (content.caption or "")[:180],
        }
        for content in contents
    ]
    service = OpenRouterService(timeout=60)
    response = service.chat(
        messages=[
            {
                "role": "system",
                "content": (
                    "You are Kova, scheduling social posts for a business in Kenya. "
                    "Spread the posts across the next 7–14 days. Prefer late afternoon and "
                    "evening in Nairobi, when shoppers are likely to see them. "
                    "Respect these hard cadence caps (Meta does not publish a single "
                    "official number; these match common Page/IG guidance and the "
                    "owner's settings):\n"
                    f"- Facebook: max {limits.facebook_max_per_day}/day, "
                    f"{limits.facebook_max_per_week}/week\n"
                    f"- Instagram: max {limits.instagram_max_per_day}/day, "
                    f"{limits.instagram_max_per_week}/week\n"
                    f"- At least {limits.min_hours_between} hours between posts "
                    "on the same channel.\n"
                    "Do not place two posts for the same channel closer than that gap. "
                    "Vary products so the same product is not posted back to back. "
                    "Return JSON {\"plan\": [{\"content_id\": number, "
                    "\"scheduled_at\": ISO-8601 with +03:00, \"reason\": short string}]}. "
                    "Include every content_id exactly once. Every time must be in the future."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "business": business.name,
                        "location": business.location,
                        "now_nairobi": now.isoformat(),
                        "posts": pieces,
                    },
                    ensure_ascii=False,
                ),
            },
        ],
        temperature=0.3,
        max_tokens=1500,
        response_format={"type": "json_object"},
    )
    try:
        raw = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenRouterError("Kova could not build a schedule.") from exc
    if not isinstance(raw, str):
        raise OpenRouterError("Kova could not build a schedule.")
    text = raw.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise OpenRouterError("Kova could not build a schedule.") from exc
    plan = parsed.get("plan") if isinstance(parsed, dict) else None
    if not isinstance(plan, list):
        raise OpenRouterError("Kova could not build a schedule.")
    return plan
