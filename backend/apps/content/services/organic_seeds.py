"""Dynamic organic content seed ideas tailored to the business."""

from __future__ import annotations

import json
import uuid

from apps.businesses.models import Business
from apps.content.services.campaign import _build_facts
from apps.content.services.organic import ORGANIC_THEMES
from apps.business_brain.services.draft import _parse_json
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService

VALID_THEME_KEYS = {t["key"] for t in ORGANIC_THEMES}


def _fallback_seeds(business: Business) -> list[dict]:
    """Deterministic seeds when AI is unavailable."""
    facts = _build_facts(business, "", product=None)
    name = facts.get("business_name") or business.name or "your business"
    industry = (facts.get("industry") or "your field").strip()
    location = (facts.get("location") or "").strip()
    audience = (facts.get("primary_audience") or "your customers").strip()
    loc_bit = f" in {location}" if location else ""

    templates: list[tuple[str, str, str]] = [
        (
            "educate",
            f"Teach one useful {industry} tip",
            f"Share a practical how-to your {audience} can use this week — no product push.",
        ),
        (
            "tip",
            "Quick win for followers",
            f"One short tip that saves time or money for people who buy from {name}.",
        ),
        (
            "behind_scenes",
            "Show how you work",
            f"A peek at how {name} prepares orders or delivers service{loc_bit}.",
        ),
        (
            "story",
            "Why we started",
            f"The moment or reason {name} exists — keep it honest and human.",
        ),
        (
            "faq",
            "Answer a common question",
            f"Clear answer to something {audience} asks before they DM or visit.",
        ),
        (
            "community",
            "Celebrate your people",
            f"Shout-out to a customer, partner, or neighborhood moment around {name}.",
        ),
    ]

    seeds: list[dict] = []
    for theme_key, title, brief in templates:
        seeds.append({
            "id": str(uuid.uuid4()),
            "title": title,
            "brief": brief,
            "theme_key": theme_key,
            "theme_label": next(
                (t["label"] for t in ORGANIC_THEMES if t["key"] == theme_key),
                theme_key,
            ),
        })
    return seeds


def _normalize_seeds(raw: list) -> list[dict]:
    out: list[dict] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        theme_key = str(item.get("theme_key") or "educate").strip().lower()
        if theme_key not in VALID_THEME_KEYS:
            theme_key = "educate"
        title = str(item.get("title") or "").strip()
        brief = str(item.get("brief") or item.get("angle") or "").strip()
        if not title or not brief:
            continue
        out.append({
            "id": str(item.get("id") or uuid.uuid4()),
            "title": title[:120],
            "brief": brief[:500],
            "theme_key": theme_key,
            "theme_label": next(
                (t["label"] for t in ORGANIC_THEMES if t["key"] == theme_key),
                theme_key.replace("_", " ").title(),
            ),
        })
    return out[:8]


def pick_autopilot_organic_seed(business: Business) -> dict:
    """
    One seed for today's autopilot shift (rotates so angles do not repeat daily).
    """
    from datetime import date

    seeds = generate_organic_seeds(business)
    if not seeds:
        return {
            "id": "fallback",
            "title": "Quick tip",
            "brief": "Share one useful tip for your customers today.",
            "theme_key": "tip",
            "theme_label": "Quick tip",
        }
    idx = date.today().toordinal() % len(seeds)
    return seeds[idx]


def generate_organic_seeds(business: Business) -> list[dict]:
    """
    Return 5–8 organic post angles for the owner to pick from.
    Falls back to template seeds if AI fails.
    """
    facts = _build_facts(business, "", product=None)
    theme_keys = [t["key"] for t in ORGANIC_THEMES]
    system = (
        "You are Kova, a social media strategist for small businesses. "
        "Suggest organic (non-promotional) post ideas. "
        "Do not invent products, prices, or URLs. "
        "Reply with JSON only."
    )
    user_prompt = (
        "Using the business facts below, return a JSON object with key "
        '"seeds": an array of 6 objects. Each object must have:\n'
        '- "title": short label (max 8 words)\n'
        '- "brief": 1–2 sentences the owner can use as a creative brief\n'
        f'- "theme_key": one of {json.dumps(theme_keys)}\n\n'
        f"Business facts:\n{json.dumps(facts, ensure_ascii=True)}"
    )

    try:
        service = OpenRouterService(timeout=45)
        response = service.chat(
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.65,
            max_tokens=1200,
            response_format={"type": "json_object"},
        )
        raw = response["choices"][0]["message"]["content"]
        if not isinstance(raw, str):
            raise OpenRouterError("empty")
        parsed = _parse_json(raw)
        seeds_raw = parsed.get("seeds") if isinstance(parsed, dict) else None
        if not isinstance(seeds_raw, list):
            raise OpenRouterError("bad shape")
        normalized = _normalize_seeds(seeds_raw)
        if len(normalized) >= 4:
            return normalized
    except (OpenRouterError, KeyError, IndexError, TypeError, ValueError):
        pass

    return _fallback_seeds(business)
