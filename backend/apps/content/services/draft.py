"""
Draft social content from the Business Brain and Commerce products.

The draft service generates content-type-aware output:
- post / status / other → caption + call_to_action + hashtags
- carousel → slides (each with caption + suggested product image) + hashtags
- reel → caption (as script concept) + call_to_action + hashtags
- story → short caption + call_to_action + hashtags

When a product is attached, the service includes its images, price,
selling points, and description so the AI can reference real facts.
Product images are returned as media_urls for the frontend to preview.
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
from apps.commerce.services.storefront import absolute_product_url, append_product_link
from apps.content.models import Content
from apps.content.services.content_quality import (
    assign_slide_media,
    can_publish_native_carousel,
    sanitize_copy,
)
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService


def draft_post(
    business: Business,
    *,
    platform: str,
    content_type: str,
    note: str = "",
    product_id: int | None = None,
) -> dict:
    """Return a content-type-aware draft. The caller decides what to save."""

    platform = (platform or "").strip().lower()
    content_type = (content_type or "").strip().lower()
    if platform not in Content.Platform.values:
        raise ValueError("Choose a platform Kova knows.")
    if content_type not in Content.ContentType.values:
        raise ValueError("Choose a post type Kova knows.")

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
                product_images.append(img.image.url)

    facts = _build_facts(business, platform, content_type, note, product)
    prompt = _build_prompt(content_type, facts)

    service = OpenRouterService(timeout=60)
    response = service.chat(
        messages=[
            {"role": "system", "content": _system_prompt(content_type)},
            {"role": "user", "content": prompt},
        ],
        temperature=0.5,
        max_tokens=1200,
        response_format={"type": "json_object"},
    )
    result = _parse_response(response, content_type)
    allow_swipe = (
        content_type == "carousel" and can_publish_native_carousel(product_images)
    )
    caption, cta = sanitize_copy(
        result.get("caption", ""),
        result.get("call_to_action", ""),
        allow_swipe=allow_swipe,
    )
    result["caption"] = caption
    result["call_to_action"] = cta
    if content_type == "carousel":
        result["slides"] = assign_slide_media(
            result.get("slides") or [],
            product_images,
        )
        result["slides"] = [
            {
                **s,
                "caption": sanitize_copy(s["caption"], allow_swipe=allow_swipe)[0],
            }
            for s in result["slides"]
        ]
    if product is not None:
        result["caption"] = append_product_link(result["caption"], product)
        result["product_url"] = absolute_product_url(product)
    result["media_urls"] = product_images
    if product:
        result["product_id"] = product.id
        result["product_name"] = product.name
        result["product_price"] = (
            f"{product.currency} {product.price}"
            if product.price is not None
            else ""
        )
    return result


# ------------------------------------------------------------------
# Build the business context
# ------------------------------------------------------------------

def _build_facts(
    business: Business,
    platform: str,
    content_type: str,
    note: str,
    product: Product | None,
) -> dict:
    facts: dict = {
        "business_name": business.name,
        "description": business.description,
        "industry": business.industry,
        "location": business.location,
        "platform": platform,
        "content_type": content_type,
    }
    if note.strip():
        facts["owner_note"] = note.strip()

    profile = BusinessProfile.objects.filter(business=business).first()
    if profile:
        for field in ("mission", "value_proposition", "target_market"):
            value = getattr(profile, field, "")
            if isinstance(value, str) and value.strip():
                facts[field] = value.strip()

    brand = BusinessBrand.objects.filter(business=business).first()
    if brand:
        for field in ("voice", "tone", "positioning", "content_style"):
            value = getattr(brand, field, "")
            if isinstance(value, str) and value.strip():
                facts[field] = value.strip()

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

    if product is not None:
        p: dict = {
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
        }
        if product.brand:
            p["brand"] = product.brand
        if product.material:
            p["material"] = product.material
        if product.size:
            p["size"] = product.size
        image_count = product.images.count()
        p["image_count"] = image_count
        facts["product"] = p

    return facts


# ------------------------------------------------------------------
# System prompts per content type
# ------------------------------------------------------------------

def _system_prompt(content_type: str) -> str:
    base = (
        "You write social content for a small business using Kova. "
        "Use the business facts, brand voice, and product information provided. "
        "Do not invent prices, addresses, awards, stock levels, or offers "
        "that were not provided. "
        "Write the way the brand voice asks. "
        "Reply with one JSON object and no markdown."
    )

    if content_type == "carousel":
        return (
            f"{base} "
            "For carousel content, write multiple slides that map to separate "
            "images. Each slide caption is short overlay text — introduce the "
            "product, highlight a feature or benefit, show a use case, then CTA. "
            "Only say swipe if the brief confirms multiple images will publish. "
            "Mention price at most once. Never invent a fake slide deck in the "
            "main caption."
        )
    if content_type == "reel":
        return (
            f"{base} "
            "For reel content, write a short script concept with a hook "
            "in the first line, the value in the middle, and a call to "
            "action at the end. Keep it punchy and natural."
        )
    if content_type == "story":
        return (
            f"{base} "
            "For story content, keep it very short and direct. Stories "
            "are quick — one strong line, maybe two. Think of it as a "
            "teaser that drives action."
        )
    return base


# ------------------------------------------------------------------
# Build the user prompt per content type
# ------------------------------------------------------------------

def _build_prompt(content_type: str, facts: dict) -> str:
    facts_json = json.dumps(facts, ensure_ascii=True)

    if content_type == "carousel":
        return (
            "Write a carousel post.\n"
            "Return JSON with these keys:\n"
            '- "slides": array of 3–6 objects, each with "caption" (one slide\'s text).\n'
            '  Slide 1: hook or introduction.\n'
            '  Middle slides: features, benefits, or use cases.\n'
            '  Last slide: call to action.\n'
            '- "caption": the main post caption that accompanies the carousel.\n'
            '- "call_to_action": one short line.\n'
            '- "hashtags": array of 5–10 relevant hashtag strings without #.\n'
            f"Facts:\n{facts_json}"
        )

    if content_type == "reel":
        return (
            "Write a reel script concept.\n"
            "Return JSON with these keys:\n"
            '- "caption": the reel caption, written as a short script.\n'
            '  Line 1: the hook (first 3 seconds).\n'
            '  Lines 2–4: the value or story.\n'
            '  Last line: the call to action.\n'
            '- "call_to_action": one short overlay text line.\n'
            '- "hashtags": array of 5–10 relevant hashtag strings without #.\n'
            f"Facts:\n{facts_json}"
        )

    if content_type == "story":
        return (
            "Write a story.\n"
            "Return JSON with these keys:\n"
            '- "caption": very short — 1 or 2 punchy lines maximum.\n'
            '- "call_to_action": a quick tap or DM prompt (never say swipe-up).\n'
            '- "hashtags": array of 3–5 relevant hashtag strings without #.\n'
            f"Facts:\n{facts_json}"
        )

    if content_type == "status":
        return (
            "Write a WhatsApp status or short update.\n"
            "Return JSON with these keys:\n"
            '- "caption": one short paragraph, conversational and direct.\n'
            '- "call_to_action": one short line.\n'
            '- "hashtags": array of 3–5 relevant hashtag strings without #.\n'
            f"Facts:\n{facts_json}"
        )

    # Default: post
    return (
        "Write a social media post.\n"
        "Return JSON with these keys:\n"
        '- "caption": the post text, ready to copy. Match length to the platform. '
        "Instagram and Facebook can be a short paragraph. X stays shorter.\n"
        '- "call_to_action": one short line, such as asking them to order on '
        "WhatsApp or view the store.\n"
        '- "hashtags": array of 5–10 relevant hashtag strings without #.\n'
        f"Facts:\n{facts_json}"
    )


# ------------------------------------------------------------------
# Parse the AI response
# ------------------------------------------------------------------

def _parse_response(response: dict, content_type: str) -> dict:
    try:
        raw = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenRouterError("Kova could not read the draft.") from exc
    if not isinstance(raw, str):
        raise OpenRouterError("Kova could not read the draft.")

    parsed = _parse_json(raw)
    caption = str(parsed.get("caption") or "").strip()
    if not caption:
        raise OpenRouterError("Kova returned a draft without a caption.")

    result: dict = {
        "caption": caption[:4000],
        "call_to_action": str(parsed.get("call_to_action") or "").strip()[:500],
        "hashtags": _clean_hashtags(parsed.get("hashtags")),
    }

    if content_type == "carousel":
        slides = parsed.get("slides")
        if isinstance(slides, list):
            result["slides"] = [
                {
                    "caption": str(s.get("caption") or "").strip()[:1000],
                    "media_url": "",
                    "product_id": None,
                }
                for s in slides
                if isinstance(s, dict) and str(s.get("caption") or "").strip()
            ]
        else:
            result["slides"] = []

    return result


def _clean_hashtags(raw) -> list[str]:
    if not isinstance(raw, list):
        return []
    tags: list[str] = []
    for item in raw:
        tag = str(item).strip().lstrip("#").strip()
        if tag and len(tag) <= 60:
            tags.append(tag)
    return tags[:15]
