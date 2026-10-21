"""Starter questions for Talk to Kova.

The lines come from what the business is doing and from the same public
market search used for the market brief. They are kept for half a day so
opening the chat does not search again every time.
"""

from __future__ import annotations

import json
from datetime import timedelta

from django.utils import timezone

from apps.business_brain.models import BusinessMarketBrief
from apps.business_brain.services.research import _facts, _search_query
from apps.business_brain.services.search import MarketSearchError, search_market
from apps.businesses.models import Business
from apps.commerce.models import Order, Product
from apps.content.models import Content
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService
from apps.social.models import SocialMessage, SocialPost

FRESH_FOR = timedelta(hours=12)


def starter_prompts(business: Business) -> list[str]:
    brief, _created = BusinessMarketBrief.objects.get_or_create(business=business)
    if _is_fresh(brief):
        return [str(item) for item in brief.starter_prompts if str(item).strip()][:4]

    activity = _activity(business)
    note = _market_note(business, brief)
    prompts = _ask_for_prompts(business, activity, note) or _fallback(activity, brief)
    prompts = [item for item in prompts if item][:4]
    brief.starter_prompts = prompts
    brief.starter_prompts_at = timezone.now()
    brief.save(update_fields=["starter_prompts", "starter_prompts_at", "updated_at"])
    return prompts


def _is_fresh(brief: BusinessMarketBrief) -> bool:
    if not brief.starter_prompts or brief.starter_prompts_at is None:
        return False
    return timezone.now() - brief.starter_prompts_at < FRESH_FOR


def _activity(business: Business) -> dict:
    products = list(
        Product.objects.filter(business=business, status=Product.Status.ACTIVE)
        .order_by("-updated_at")[:6]
    )
    waiting = SocialMessage.objects.filter(
        business=business,
        direction=SocialMessage.Direction.INBOUND,
        delivery_status=SocialMessage.Delivery.RECEIVED,
    ).count()
    drafts = Content.objects.filter(
        business=business,
        status=Content.Status.DRAFT,
    ).count()
    scheduled = SocialPost.objects.filter(
        content__business=business,
        publishing_status=SocialPost.PublishingStatus.SCHEDULED,
    ).count()
    new_orders = Order.objects.filter(
        business=business,
        status=Order.Status.NEW,
    ).count()
    return {
        "products": [
            {
                "name": product.name,
                "price": str(product.price) if product.price is not None else "",
                "currency": product.currency,
                "category": product.category,
            }
            for product in products
        ],
        "unanswered_messages": waiting,
        "draft_posts": drafts,
        "scheduled_posts": scheduled,
        "new_orders": new_orders,
    }


def _market_note(business: Business, brief: BusinessMarketBrief) -> str:
    parts = []
    if brief.summary.strip():
        parts.append(brief.summary.strip())
    if brief.gap.strip():
        parts.append(brief.gap.strip())
    saved = "\n".join(parts)

    stale = (
        brief.researched_at is None
        or timezone.now() - brief.researched_at > timedelta(days=2)
    )
    if not stale and saved:
        return saved

    service = OpenRouterService(timeout=90)
    query = (
        "Search for what shoppers are looking for, and what similar sellers "
        "are posting, around this business. Name a trend only when a page states it.\n"
        f"{_search_query(business)}"
    )
    try:
        note, _citations = search_market(service, query)
    except MarketSearchError:
        return saved
    return note.strip() or saved


def _ask_for_prompts(business: Business, activity: dict, note: str) -> list[str]:
    service = OpenRouterService(timeout=60)
    try:
        payload = service.chat(
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You write four short questions a business owner can ask Kova. "
                        "Use only the activity and the market note. "
                        "Name a product only if it is in the activity. "
                        "Mention a trend only if the market note states it. "
                        "One question should be about what is happening now. "
                        "One should suggest content from the market note. "
                        "One should be about products or orders that are actually listed. "
                        "Do not invent customers, prices, or products. "
                        "Return JSON: {\"prompts\": [\"...\", \"...\", \"...\", \"...\"]}"
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "business": _facts(business),
                            "activity": activity,
                            "market_note": note[:4000],
                        },
                        ensure_ascii=True,
                    ),
                },
            ],
            temperature=0.3,
            max_tokens=500,
            response_format={"type": "json_object"},
            reasoning={"effort": "low"},
            feature="starters",
            business_id=getattr(business, "id", None),
        )
    except OpenRouterError:
        return []

    try:
        raw = payload["choices"][0]["message"]["content"]
        parsed = json.loads(raw) if isinstance(raw, str) else {}
    except (KeyError, IndexError, TypeError, json.JSONDecodeError):
        return []

    prompts = parsed.get("prompts") if isinstance(parsed, dict) else None
    if not isinstance(prompts, list):
        return []
    return [str(item).strip()[:180] for item in prompts if str(item).strip()]


def _fallback(activity: dict, brief: BusinessMarketBrief) -> list[str]:
    prompts: list[str] = []
    products = activity.get("products") or []
    if products:
        first = products[0]
        price = f" at {first['currency']} {first['price']}" if first.get("price") else ""
        prompts.append(f"Draft a post for {first['name']}{price}.")
    if activity.get("unanswered_messages"):
        count = activity["unanswered_messages"]
        prompts.append(f"We have {count} messages waiting. Draft the replies.")
    if activity.get("new_orders"):
        prompts.append(f"We have {activity['new_orders']} new orders. What should I do next?")
    if activity.get("draft_posts"):
        prompts.append(f"I have {activity['draft_posts']} drafts. Which one should go out?")
    if brief.gap.strip():
        prompts.append(f"Turn this market gap into a post: {brief.gap.strip()[:120]}")
    if not prompts:
        prompts.append("What should I post from the products I already have?")
    return prompts[:4]
