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
from apps.content.services.content_quality import (
    assign_slide_media,
    can_publish_native_carousel,
    formats_for_channel,
    image_count,
    sanitize_copy,
)
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService
from apps.social.models import SocialAccount


# Legacy static map (tests / callers). Prefer formats_for_channel().
CHANNEL_FORMATS: dict[str, list[tuple[str, str]]] = {
    SocialAccount.Platform.FACEBOOK_PAGE: [
        ("facebook", "post"),
        ("facebook", "carousel"),
    ],
    SocialAccount.Platform.INSTAGRAM: [
        ("instagram", "post"),
        ("instagram", "carousel"),
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
    primary_only: bool = False,
) -> dict:
    """
    Generate adapted content for every connected channel.

    Returns {batch_id, product, channels: [{account, pieces: [...]}]}.
    When primary_only=True (autopilot), one honest format per account.
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

    n_images = image_count(product_images)
    native_carousel = can_publish_native_carousel(product_images)
    from apps.content.services.kenya_relatable import is_kenya_relatable_enabled

    reel_briefs = is_kenya_relatable_enabled(business) and not primary_only

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
        formats = formats_for_channel(
            account,
            image_count_n=n_images,
            organic=False,
            primary_only=primary_only,
            reel_briefs=reel_briefs,
        )
        for content_platform, content_type in formats:
            format_specs.append({
                "account_id": account.id,
                "account_name": account.account_name or account.account_username,
                "platform": content_platform,
                "content_type": content_type,
                "ai_key": (
                    f"account_{account.id}_{content_platform}_{content_type}"
                ),
            })

    if not format_specs:
        if chosen in {"facebook", "instagram"}:
            raise ValueError(f"Connect {chosen.title()} before creating content for it.")
        raise ValueError("Connected accounts do not support content creation yet.")

    facts = _build_facts(business, note, product)
    facts["native_carousel_available"] = native_carousel
    facts["product_image_count"] = n_images
    ai_result = _call_ai(facts, format_specs, native_carousel=native_carousel)

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
        ai_key = spec.get("ai_key") or (
            f"{spec['platform']}_{spec['content_type']}"
        )
        piece_data = ai_result.get(ai_key, {})
        if not piece_data.get("caption"):
            fallback = f"{spec['platform']}_{spec['content_type']}"
            piece_data = ai_result.get(fallback, piece_data)
        if not piece_data.get("caption"):
            continue

        is_carousel = spec["content_type"] == "carousel"
        is_reel = spec["content_type"] == "reel"
        allow_swipe = is_carousel and native_carousel
        caption, cta = sanitize_copy(
            str(piece_data.get("caption", "")),
            str(piece_data.get("call_to_action", "")),
            allow_swipe=allow_swipe,
        )
        slides = _clean_slides(
            piece_data.get("slides") if is_carousel else None,
            product_images if is_carousel else None,
        )
        if is_carousel:
            slides = [
                {
                    **s,
                    "caption": sanitize_copy(s["caption"], allow_swipe=allow_swipe)[0],
                }
                for s in slides
            ]
        elif is_reel and facts.get("kenya_relatable_mode"):
            from apps.content.services.kenya_relatable import (
                format_skit_into_caption,
                skit_beats_as_slides,
            )

            skit = piece_data.get("skit_brief")
            caption = format_skit_into_caption(caption, skit)
            slides = skit_beats_as_slides(skit)

        content = Content.objects.create(
            business=business,
            batch=batch,
            product=product,
            social_account=account_map.get(spec["account_id"]),
            platform=spec["platform"],
            content_type=spec["content_type"],
            caption=append_product_link(caption[:3800], product)[:4000],
            call_to_action=cta[:500],
            hashtags=_clean_hashtags(piece_data.get("hashtags")),
            media_urls=product_images,
            slides=slides,
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

    from apps.content.services.kenya_relatable import apply_relatable_facts

    return apply_relatable_facts(facts, business)


# ------------------------------------------------------------------
# AI call
# ------------------------------------------------------------------

def _call_ai(
    facts: dict,
    format_specs: list[dict],
    *,
    native_carousel: bool = False,
) -> dict:
    formats_desc = []
    for spec in format_specs:
        ai_key = spec.get("ai_key") or (
            f"{spec['platform']}_{spec['content_type']}"
        )
        formats_desc.append({
            "key": ai_key,
            "platform": spec["platform"],
            "type": spec["content_type"],
            "account_name": spec.get("account_name") or "",
        })

    carousel_rules = (
        "Carousels are real multi-image posts: write 3–6 short slide captions "
        "(hook → details → CTA). You may say people can swipe only for carousel types. "
        "Mention the price at most once in the whole piece. "
        if native_carousel
        else
        "Do not write carousel pieces unless listed. Never say swipe, swipe through, "
        "or scroll through. Never invent a numbered slide deck in a regular post. "
        "Mention the price at most once."
    )

    from apps.content.services.kenya_relatable import (
        locale_system_addon,
        reel_skit_system_addon,
        reel_skit_user_json_addon,
    )

    system = (
        "You are Kova, a social media manager for a small business. "
        "You create adapted content for multiple platforms simultaneously "
        "from the same brief. When several Facebook Pages are listed, "
        "write separate copy per account_name (each Page is its own brand voice). "
        "Each piece must be native to its platform: "
        "Instagram posts use hashtags and a visual voice, "
        "Facebook posts can be slightly longer with a conversational tone. "
        f"{carousel_rules} "
        "Use the business facts, brand voice, and product details provided. "
        "Do not invent prices, stock, awards, or offers not in the facts. "
        "When product.public_url is present, end the caption with that exact address "
        "and do not write any other web address. "
        "Reply with one JSON object and no markdown."
        f"{locale_system_addon(facts)}"
        f"{reel_skit_system_addon(facts)}"
    )

    carousel_json = (
        "For carousel types, also include:\n"
        '- "slides": array of 3–6 objects with "caption" (one slide\'s short text).\n'
        if native_carousel
        else ""
    )
    skit_json = reel_skit_user_json_addon(facts)

    user_prompt = (
        "Generate adapted content for these formats:\n"
        f"{json.dumps(formats_desc, ensure_ascii=True)}\n\n"
        "Return a JSON object where each key matches the \"key\" field from the "
        "formats list (e.g. account_12_facebook_post) and each value is an object with:\n"
        '- "caption": the post text adapted to that platform and format.\n'
        '- "call_to_action": one short action line.\n'
        '- "hashtags": array of 5–10 hashtag strings without #.\n'
        f"{carousel_json}"
        f"{skit_json}\n"
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


def _clean_slides(raw, media_urls: list[str] | None = None) -> list[dict]:
    if not isinstance(raw, list):
        return []
    slides: list[dict] = []
    for s in raw:
        if isinstance(s, dict) and str(s.get("caption") or "").strip():
            slides.append({
                "caption": str(s["caption"]).strip()[:1000],
                "media_url": str(s.get("media_url") or "").strip(),
                "product_id": s.get("product_id"),
            })
    return assign_slide_media(slides, media_urls or [])
