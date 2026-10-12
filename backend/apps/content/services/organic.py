"""Organic (non-product) social content for education, trust, and brand story."""

from __future__ import annotations

import json

from apps.businesses.models import Business
from apps.commerce.services.storefront import absolute_media_url
from apps.content.models import Content, ContentBatch
from apps.content.services.campaign import (
    CHANNEL_FORMATS,
    _build_facts,
    _clean_hashtags,
    _clean_slides,
    get_connected_channels,
)
from apps.social.models import SocialAccount
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService
from apps.business_brain.services.draft import _parse_json


ORGANIC_THEMES: list[dict[str, str]] = [
    {
        "key": "educate",
        "label": "Educate",
        "description": "Teach something useful about your industry or craft.",
    },
    {
        "key": "tip",
        "label": "Quick tip",
        "description": "One practical tip customers can use today.",
    },
    {
        "key": "behind_scenes",
        "label": "Behind the scenes",
        "description": "Show how you work, pack orders, or prepare service.",
    },
    {
        "key": "story",
        "label": "Brand story",
        "description": "Why you started, values, or a customer moment.",
    },
    {
        "key": "faq",
        "label": "Answer a FAQ",
        "description": "Clear answer to a question buyers often ask.",
    },
    {
        "key": "seasonal",
        "label": "Timely / seasonal",
        "description": "Relevant note for the week, season, or local moment.",
    },
    {
        "key": "community",
        "label": "Community",
        "description": "Celebrate customers, partners, or your neighborhood.",
    },
]


def _theme_label(key: str) -> str:
    for theme in ORGANIC_THEMES:
        if theme["key"] == key:
            return theme["label"]
    return key.replace("_", " ").title()


def _organic_format_specs(business: Business, platform: str) -> list[dict]:
    accounts = get_connected_channels(business)
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
            if content_type == "story":
                continue
            format_specs.append({
                "account_id": account.id,
                "account_name": account.account_name or account.account_username,
                "platform": content_platform,
                "content_type": content_type,
            })
    return format_specs


def _call_organic_ai(
    facts: dict,
    format_specs: list[dict],
    *,
    theme_key: str,
) -> dict:
    formats_desc = []
    for spec in format_specs:
        key = f"{spec['platform']}_{spec['content_type']}"
        formats_desc.append({
            "key": key,
            "platform": spec["platform"],
            "type": spec["content_type"],
        })

    theme_label = _theme_label(theme_key)
    system = (
        "You are Kova, a social media manager for a small business. "
        "Create ORGANIC content — not a product ad. "
        "Goals: educate, inform, build trust, and stay top of mind. "
        "Do not invent products, prices, discounts, or URLs. "
        "Do not push a hard sell; one soft CTA is enough (visit, DM, follow). "
        "Each format must feel native to its platform. "
        "Reply with one JSON object and no markdown."
    )
    user_prompt = (
        f"Organic theme: {theme_label} ({theme_key}).\n"
        "Generate adapted content for these formats:\n"
        f"{json.dumps(formats_desc, ensure_ascii=True)}\n\n"
        "Return JSON keyed by format (e.g. instagram_post) with caption, "
        "call_to_action, hashtags; carousels include slides; reels as short scripts.\n\n"
        f"Business facts:\n{json.dumps(facts, ensure_ascii=True)}"
    )

    service = OpenRouterService(timeout=90)
    response = service.chat(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.55,
        max_tokens=3000,
        response_format={"type": "json_object"},
    )
    try:
        raw = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenRouterError("Kova could not generate organic content.") from exc
    if not isinstance(raw, str):
        raise OpenRouterError("Kova could not generate organic content.")

    parsed = _parse_json(raw)
    if not isinstance(parsed, dict):
        raise OpenRouterError("Kova returned content in an unexpected format.")
    return parsed


def draft_organic_campaign(
    business: Business,
    *,
    note: str = "",
    organic_theme: str = "educate",
    platform: str = "all",
    media_urls: list[str] | None = None,
) -> dict:
    """Generate organic content across connected channels (no product)."""
    theme_key = (organic_theme or "educate").strip().lower()
    valid_keys = {t["key"] for t in ORGANIC_THEMES}
    if theme_key not in valid_keys:
        raise ValueError("Choose a supported organic content theme.")

    format_specs = _organic_format_specs(business, platform)
    if not format_specs:
        raise ValueError(
            "Connect at least one social account before creating content.",
        )

    facts = _build_facts(business, note, product=None)
    facts["organic_theme"] = theme_key
    facts["organic_theme_label"] = _theme_label(theme_key)

    ai_result = _call_organic_ai(facts, format_specs, theme_key=theme_key)

    batch = ContentBatch.objects.create(
        business=business,
        product=None,
        brief=note.strip() or facts["organic_theme_label"],
        kind=ContentBatch.Kind.ORGANIC,
        organic_theme=theme_key,
    )

    accounts = get_connected_channels(business)
    account_map = {a.id: a for a in accounts}
    extra_media = list(media_urls or [])

    channels_response: list[dict] = []
    for spec in format_specs:
        key = f"{spec['platform']}_{spec['content_type']}"
        piece_data = ai_result.get(key, {})
        if not piece_data.get("caption"):
            continue

        content = Content.objects.create(
            business=business,
            batch=batch,
            product=None,
            social_account=account_map.get(spec["account_id"]),
            platform=spec["platform"],
            content_type=spec["content_type"],
            caption=str(piece_data.get("caption", ""))[:4000],
            call_to_action=str(piece_data.get("call_to_action", ""))[:500],
            hashtags=_clean_hashtags(piece_data.get("hashtags")),
            media_urls=extra_media,
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

    return {
        "batch_id": str(batch.id),
        "kind": batch.kind,
        "organic_theme": theme_key,
        "pieces": channels_response,
    }
