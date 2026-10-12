"""
Ask Kova when each drafted post should go out.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from django.utils import timezone

from apps.businesses.models import Business
from apps.content.models import Content
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService
from apps.social.services.publish import enqueue, parse_when

NAIROBI = ZoneInfo("Africa/Nairobi")


def schedule_posts(
    business: Business,
    content_ids: list[int],
    *,
    autopilot: bool = False,
) -> list[dict]:
    """Place each post on the calendar at a time Kova chooses."""
    contents = list(
        Content.objects.filter(business=business, pk__in=content_ids)
        .exclude(status=Content.Status.REJECTED)
        .select_related("product")
    )
    if not contents:
        raise ValueError("There is no content to schedule.")

    try:
        plan = _ask_for_times(business, contents, autopilot=autopilot)
    except OpenRouterError:
        plan = []

    by_id = {content.id: content for content in contents}
    scheduled: list[dict] = []
    now = timezone.now()

    for item in plan:
        try:
            content_id = int(item.get("content_id"))
        except (TypeError, ValueError):
            continue
        content = by_id.get(content_id)
        if content is None:
            continue
        when = _future_time(parse_when(item.get("scheduled_at")), now)
        if when is None:
            continue
        enqueue(content, when)
        scheduled.append(_scheduled_row(content, when, item.get("reason")))

    missing = set(by_id) - {row["content_id"] for row in scheduled}
    if missing:
        for content, when in _fallback_times(
            [by_id[cid] for cid in sorted(missing)],
            now,
            autopilot=autopilot,
        ):
            enqueue(content, when)
            scheduled.append(_scheduled_row(content, when, "Spread on the calendar."))

    still_missing = set(by_id) - {row["content_id"] for row in scheduled}
    if still_missing:
        raise OpenRouterError("Kova could not place every post on the calendar.")
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


def _fallback_times(
    contents: list[Content],
    now: datetime,
    *,
    autopilot: bool,
) -> list[tuple[Content, datetime]]:
    """Deterministic spacing when the model omits or backdates slots."""
    if not contents:
        return []
    start_gap = timedelta(minutes=45 if autopilot else 90)
    step = timedelta(hours=6)
    rows: list[tuple[Content, datetime]] = []
    cursor = now + start_gap
    for index, content in enumerate(contents):
        when = cursor + step * index
        rows.append((content, when))
    return rows


def _ask_for_times(
    business: Business,
    contents: list[Content],
    *,
    autopilot: bool = False,
) -> list[dict]:
    now = datetime.now(NAIROBI)
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
                    "Spread the posts across the next 7 days. Prefer late afternoon and "
                    "evening in Nairobi, when shoppers are likely to see them. "
                    "Do not place two posts in the same hour. "
                    "Vary products so the same product is not posted back to back. "
                    + (
                        "Autopilot is on: place the first post within the next 90 minutes, "
                        "then space the rest across the week. "
                        if autopilot
                        else ""
                    )
                    + "Return JSON {\"plan\": [{\"content_id\": number, "
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
