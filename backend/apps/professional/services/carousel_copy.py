"""LinkedIn carousel outline text — no deck-style \"Slide N:\" labels."""

from __future__ import annotations

import re

_SLIDE_PREFIX = re.compile(
    r"^(?:slide\s+\d+\s*[:.\-–—]\s*|slide\s+\d+\s+)",
    re.IGNORECASE,
)


def normalize_carousel_line(text: str) -> str:
    cleaned = _SLIDE_PREFIX.sub("", str(text or "").strip()).strip()
    return cleaned


def normalize_carousel_slides(slides: list | None) -> list[str]:
    if not slides:
        return []
    out: list[str] = []
    for item in slides:
        line = normalize_carousel_line(item)
        if line:
            out.append(line)
    return out


def linkedin_carousel_copy(body: str, slides: list | None) -> str:
    """One paste-ready LinkedIn post: hook plus outline points."""
    parts: list[str] = []
    hook = (body or "").strip()
    if hook:
        parts.append(hook)
    for line in normalize_carousel_slides(slides):
        parts.append(line)
    return "\n\n".join(parts)
