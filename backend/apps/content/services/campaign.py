"""
Campaign draft service.

Kova acts as a social media manager.  Given a brief (note + optional
product), Kova generates adapted content for every connected healthy
channel simultaneously.

The mapping from SocialAccount.Platform to Content formats:
- facebook_page  → post, carousel
- instagram      → post, carousel, reel, story

One AI call produces the full bundle so it stays coherent across
channels while adapting length, tone, and format to each platform.
"""

from __future__ import annotations

import json

from apps.business_brain.models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessMarketBrief,
    BusinessProfile,
)
from apps.business_brain.services.draft import _parse_json
from apps.businesses.models import Business
from apps.commerce.models import Product
from apps.commerce.services.storefront import (
    absolute_media_url,
    absolute_product_url,
    append_product_link,
)
from apps.content.models import Content, ContentBatch
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService
from apps.social.models import SocialAccount


# Which Content formats to generate per SocialAccount platform
CHANNEL_FORMATS: dict[str, list[tuple[str, str]]] = {
    SocialAccount.Platform.FACEBOOK_PAGE: [
        ("facebook", "post"),
        ("facebook", "carousel"),
    ],
    SocialAccount.Platform.INSTAGRAM: [
        ("instagram", "post"),
        ("instagram", "carousel"),
        ("instagram", "reel"),
        ("instagram", "story"),
    ],
}


def get_connected_channels(business: Business) -> list[SocialAccount]:
    """Return healthy connected accounts for a business."""
    return list(
        SocialAccount.objects.filter(
            business=business,
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
    )


def draft_campaign(
    business: Business,
    *,
    note: str = "",
    product_id: int | None = None,
    platform: str = "all",
) -> dict:
    """
    Generate adapted content for every connected channel.

    Returns {batch_id, product, channels: [{account, pieces: [...]}]}.
    """
    accounts = get_connected_channels(business)
    if not accounts:
        raise ValueError(
            "Connect at least one social account before creating content."
        )

    product = None
    product_images: list[str] = []
    if product_id:
        product = (
            Product.objects
            .filter(business=business, id=product_id)
            .prefetch_related("images")
            .first()
        )
        if product is None:
            raise ValueError("That product is not in this business.")
        for img in product.images.all():
            if img.image:
                product_images.append(absolute_media_url(img.image.url))

    # Build the list of formats to generate
    format_specs: list[dict] = []
    chosen = (platform or "all").strip().lower()
    for account in accounts:
        account_platform = (
            "facebook"
            if account.platform == SocialAccount.Platform.FACEBOOK_PAGE
            else "instagram"
            if account.platform == SocialAccount.Platform.INSTAGRAM
            else ""
        )
        if chosen not in {"", "all"} and account_platform != chosen:
            continue
        formats = CHANNEL_FORMATS.get(account.platform, [])
        for content_platform, content_type in formats:
            format_specs.append({
                "account_id": account.id,
                "account_name": account.account_name or account.account_username,
                "platform": content_platform,
                "content_type": content_type,
            })

    if not format_specs:
        if chosen in {"facebook", "instagram"}:
            raise ValueError(f"Connect {chosen.title()} before creating content for it.")
        raise ValueError("Connected accounts do not support content creation yet.")

    facts = _build_facts(business, note, product)
    ai_result = _call_ai(facts, format_specs)

    # Create the batch and Content records
    batch = ContentBatch.objects.create(
        business=business,
        product=product,
        brief=note.strip(),
        kind=ContentBatch.Kind.PRODUCT,
    )

    channels_response: list[dict] = []
    account_map = {a.id: a for a in accounts}

    for spec in format_specs:
        key = f"{spec['platform']}_{spec['content_type']}"
        piece_data = ai_result.get(key, {})
        if not piece_data.get("caption"):
            continue

        content = Content.objects.create(
            business=business,
            batch=batch,
            product=product,
            social_account=account_map.get(spec["account_id"]),
            platform=spec["platform"],
            content_type=spec["content_type"],
            caption=append_product_link(
                str(piece_data.get("caption", ""))[:3800],
                product,
            )[:4000],
            call_to_action=str(piece_data.get("call_to_action", ""))[:500],
            hashtags=_clean_hashtags(piece_data.get("hashtags")),
            media_urls=product_images,
            slides=_clean_slides(piece_data.get("slides")),
            created_by_ai=True,
        )

        channels_response.append({
            "id": content.id,
            "account_id": spec["account_id"],
            "account_name": spec["account_name"],
            "platform": spec["platform"],
            "content_type": spec["content_type"],
            "caption": content.caption,
            "call_to_action": content.call_to_action,
            "hashtags": content.hashtags,
            "slides": content.slides,
            "media_urls": content.media_urls,
            "status": content.status,
        })

    result: dict = {
        "batch_id": str(batch.id),
        "pieces": channels_response,
    }
    if product:
        result["product_id"] = product.id
        result["product_name"] = product.name
        result["product_price"] = (
            f"{product.currency} {product.price}"
            if product.price is not None
            else ""
        )
        result["product_images"] = product_images

    return result


# ------------------------------------------------------------------
# Build business context
# ------------------------------------------------------------------

def _build_facts(business: Business, note: str, product: Product | None) -> dict:
    facts: dict = {
        "business_name": business.name,
        "description": business.description,
        "industry": business.industry,
        "location": business.location,
    }
    if note.strip():
        facts["owner_brief"] = note.strip()

    profile = BusinessProfile.objects.filter(business=business).first()
    if profile:
        for field in ("mission", "value_proposition", "target_market"):
            v = getattr(profile, field, "")
            if isinstance(v, str) and v.strip():
                facts[field] = v.strip()

    brand = BusinessBrand.objects.filter(business=business).first()
    if brand:
        for field in ("voice", "tone", "positioning", "content_style"):
            v = getattr(brand, field, "")
            if isinstance(v, str) and v.strip():
                facts[field] = v.strip()

    audience = BusinessAudience.objects.filter(business=business).first()
    if audience and audience.primary_audience.strip():
        facts["primary_audience"] = audience.primary_audience.strip()

    goals = BusinessGoal.objects.filter(business=business).first()
    if goals and goals.primary_goal.strip():
        facts["primary_goal"] = goals.primary_goal.strip()

    brief = BusinessMarketBrief.objects.filter(
        business=business, kept=True,
    ).first()
    if brief and brief.positioning.strip():
        facts["market_positioning"] = brief.positioning.strip()

    if product:
        facts["product"] = {
            "name": product.name,
            "category": product.category,
            "price": str(product.price) if product.price is not None else "",
            "currency": product.currency,
            "color": product.color,
            "condition": product.condition,
            "short_description": product.short_description,
            "description": product.description,
            "selling_points": product.selling_points or [],
            "keywords": product.keywords or [],
            "brand": product.brand or "",
            "material": product.material or "",
            "image_count": product.images.count(),
            "public_url": absolute_product_url(product),
        }

    return facts


# ------------------------------------------------------------------
# AI call
# ------------------------------------------------------------------

def _call_ai(facts: dict, format_specs: list[dict]) -> dict:
    formats_desc = []
    for spec in format_specs:
        key = f"{spec['platform']}_{spec['content_type']}"
        formats_desc.append({
            "key": key,
            "platform": spec["platform"],
            "type": spec["content_type"],
        })

    system = (
        "You are Kova, a social media manager for a small business. "
        "You create adapted content for multiple platforms simultaneously "
        "from the same brief. Each piece must be native to its platform: "
        "Instagram posts use hashtags and a visual voice, "
        "Facebook posts can be slightly longer with a conversational tone, "
        "reels need a punchy script (hook → value → CTA), "
        "stories need 1–2 ultra-short lines, "
        "carousels need 3–6 slides (hook → features → CTA). "
        "Use the business facts, brand voice, and product details provided. "
        "Do not invent prices, stock, awards, or offers not in the facts. "
        "When product.public_url is present, end the caption with that exact address "
        "and do not write any other web address. "
        "Reply with one JSON object and no markdown."
    )

    user_prompt = (
        "Generate adapted content for these formats:\n"
        f"{json.dumps(formats_desc, ensure_ascii=True)}\n\n"
        "Return a JSON object where each key is the format key "
        "(e.g. instagram_post, facebook_carousel) and each value is an object with:\n"
        '- "caption": the post text adapted to that platform and format.\n'
        '- "call_to_action": one short action line.\n'
        '- "hashtags": array of 5–10 hashtag strings without #.\n'
        "For carousel types, also include:\n"
        '- "slides": array of 3–6 objects with "caption" (one slide\'s text).\n'
        "For reel types, write caption as a short script "
        "(hook first line, value middle, CTA last).\n"
        "For story types, caption should be 1–2 punchy lines maximum.\n\n"
        f"Business facts:\n{json.dumps(facts, ensure_ascii=True)}"
    )

    service = OpenRouterService(timeout=90)
    response = service.chat(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.5,
        max_tokens=3000,
        response_format={"type": "json_object"},
    )

    try:
        raw = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenRouterError("Kova could not generate the content.") from exc
    if not isinstance(raw, str):
        raise OpenRouterError("Kova could not generate the content.")

    parsed = _parse_json(raw)
    if not isinstance(parsed, dict):
        raise OpenRouterError("Kova returned content in an unexpected format.")
    return parsed


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _clean_hashtags(raw) -> list[str]:
    if not isinstance(raw, list):
        return []
    tags: list[str] = []
    for item in raw:
        tag = str(item).strip().lstrip("#").strip()
        if tag and len(tag) <= 60:
            tags.append(tag)
    return tags[:15]


def _clean_slides(raw) -> list[dict]:
    if not isinstance(raw, list):
        return []
    slides: list[dict] = []
    for s in raw:
        if isinstance(s, dict) and str(s.get("caption") or "").strip():
            slides.append({
                "caption": str(s["caption"]).strip()[:1000],
                "media_url": "",
                "product_id": None,
            })
    return slides
