"""
Optional Kenya-relatable content mode.

Off (default): Kova prompts unchanged.
On: locale voice pack + reel/skit film briefs + extra organic themes.
"""

from __future__ import annotations

from apps.businesses.models import Business

RELATABLE_ORGANIC_THEMES: list[dict[str, str]] = [
    {
        "key": "relatable_moment",
        "label": "Relatable moment",
        "description": (
            "A ‘that’s me’ everyday scene (commute, office, guests, hustle) "
            "tied lightly to what you sell."
        ),
    },
    {
        "key": "hustle_day",
        "label": "Hustle day",
        "description": (
            "A day-in-the-life beat: packing, deliveries, waiting on M-Pesa, "
            "or the rush before payday."
        ),
    },
    {
        "key": "neighbour_shout",
        "label": "Neighbour shout-out",
        "description": (
            "Celebrate a customer, estate, or local moment without hard selling."
        ),
    },
]


def is_kenya_relatable_enabled(business: Business | None) -> bool:
    if business is None:
        return False
    brand = getattr(business, "brand", None)
    if brand is not None and hasattr(brand, "kenya_relatable_mode"):
        return bool(brand.kenya_relatable_mode)
    from apps.business_brain.models import BusinessBrand

    return BusinessBrand.objects.filter(
        business=business,
        kenya_relatable_mode=True,
    ).exists()


def apply_relatable_facts(facts: dict, business: Business | None) -> dict:
    """Annotate facts used by content AIs. No-op when mode is off."""
    enabled = is_kenya_relatable_enabled(business)
    facts["kenya_relatable_mode"] = enabled
    if enabled:
        facts["kenya_relatable_guidance"] = (
            "Kenya relatable mode is ON. Prefer recognition over polish: "
            "everyday Kenyan scenes, light Sheng/Swahili code-switch when natural, "
            "humour that feels local. Never invent fake customer stories, "
            "prices, or events. Do not force slang if the brand voice is formal — "
            "mix lightly. Keep claims honest."
        )
    return facts


def locale_system_addon(facts: dict | None = None) -> str:
    """Extra system-prompt lines when mode is on; empty string otherwise."""
    if not facts or not facts.get("kenya_relatable_mode"):
        return ""
    return (
        " Kenya relatable mode is enabled for this business. "
        "Write like a neighbour who knows the brand — not a corporate brochure. "
        "Use Kenya/East Africa everyday context when it fits (commute, office, "
        "family/guests, chai, football, hustle, M-Pesa moments). "
        "Light Swahili or Sheng is welcome in captions when it sounds natural; "
        "keep the CTA clear in simple English or soft Swahili. "
        "Never invent testimonials, stock, or discounts. "
        "Avoid forced slang and meme spam."
    )


def reel_skit_system_addon(facts: dict | None = None) -> str:
    if not facts or not facts.get("kenya_relatable_mode"):
        return ""
    return (
        " For reel formats, also produce a phone-filmable skit brief: "
        "a short local scene (setup → twist → product/brand land) the owner "
        "can shoot vertically. Prefer recognition humour over polished ads."
    )


def reel_skit_user_json_addon(facts: dict | None = None) -> str:
    if not facts or not facts.get("kenya_relatable_mode"):
        return ""
    return (
        'Also include "skit_brief": {\n'
        '  "scene": short scene title (Kenyan everyday moment),\n'
        '  "beats": array of exactly 3 objects, each with '
        '"label" (Setup|Twist|Land), "visual" (what to film), '
        '"line" (what to say or on-screen text),\n'
        '  "filming_notes": one short line (vertical phone, lighting, etc.)\n'
        "}.\n"
    )


def format_skit_into_caption(caption: str, skit_brief: dict | None) -> str:
    """Merge skit brief above the postable caption for owner clarity."""
    body = (caption or "").strip()
    if not isinstance(skit_brief, dict):
        return body

    scene = str(skit_brief.get("scene") or "").strip()
    notes = str(skit_brief.get("filming_notes") or "").strip()
    beats = skit_brief.get("beats")
    lines = ["FILM THIS (vertical phone)", ""]
    if scene:
        lines.append(f"Scene: {scene}")
        lines.append("")
    if isinstance(beats, list):
        for index, beat in enumerate(beats[:4], start=1):
            if not isinstance(beat, dict):
                continue
            label = str(beat.get("label") or f"Beat {index}").strip()
            visual = str(beat.get("visual") or "").strip()
            line = str(beat.get("line") or "").strip()
            chunk = f"{index}. {label}"
            if visual:
                chunk += f" — Film: {visual}"
            if line:
                chunk += f" — Say/text: {line}"
            lines.append(chunk)
        lines.append("")
    if notes:
        lines.append(f"Notes: {notes}")
        lines.append("")
    if body:
        lines.append("---")
        lines.append("CAPTION TO POST:")
        lines.append(body)
    return "\n".join(lines).strip()[:4000]


def skit_beats_as_slides(skit_brief: dict | None) -> list[dict]:
    """Store filmable beats in slides for studio UI (reel only)."""
    if not isinstance(skit_brief, dict):
        return []
    beats = skit_brief.get("beats")
    if not isinstance(beats, list):
        return []
    slides: list[dict] = []
    for beat in beats[:4]:
        if not isinstance(beat, dict):
            continue
        label = str(beat.get("label") or "Beat").strip()
        visual = str(beat.get("visual") or "").strip()
        line = str(beat.get("line") or "").strip()
        parts = [p for p in (visual, line) if p]
        if not parts and not label:
            continue
        caption = label
        if parts:
            caption = f"{label}: {' | '.join(parts)}"
        slides.append({
            "caption": caption[:1000],
            "media_url": "",
            "product_id": None,
            "kind": "skit_beat",
        })
    return slides


def organic_themes_for_business(business: Business | None) -> list[dict[str, str]]:
    from apps.content.services.organic import ORGANIC_THEMES

    themes = list(ORGANIC_THEMES)
    if is_kenya_relatable_enabled(business):
        themes = themes + list(RELATABLE_ORGANIC_THEMES)
    return themes
