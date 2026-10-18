"""
Honest content formats and caption hygiene.

Carousel pieces must only claim a swipe when we can attach 2+ images.
Captions must not tell people to swipe through numbered "slides" that
are really one photo on Meta.
"""

from __future__ import annotations

import re
from typing import Any

from apps.commerce.services.storefront import absolute_media_url
from apps.social.models import SocialAccount

# Strip only the fake-carousel instruction, keep the rest of the sentence.
_SWIPE_PATTERNS = [
    re.compile(r"\bswipe\s+through\s+(to\s+)?", re.IGNORECASE),
    re.compile(r"\bswipe\s+to\s+", re.IGNORECASE),
    re.compile(r"\bswipe\s+up\s*(to\s+)?", re.IGNORECASE),
    re.compile(r"\bswipe\s+left\s*(to\s+)?", re.IGNORECASE),
    re.compile(r"\bswipe\s+right\s*(to\s+)?", re.IGNORECASE),
    re.compile(r"\bswipe\s+and\s+", re.IGNORECASE),
    re.compile(r"\bscroll\s+through\s+(to\s+)?", re.IGNORECASE),
    re.compile(r"\bswipe\b", re.IGNORECASE),
]

_MULTI_SPACE = re.compile(r"[ \t]{2,}")
_MULTI_NL = re.compile(r"\n{3,}")


def image_count(urls: list[str] | None) -> int:
    return len(unique_image_urls(urls or []))


def unique_image_urls(urls: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for raw in urls:
        url = absolute_media_url(str(raw or "").strip())
        if not url or url in seen:
            continue
        lowered = url.lower().split("?", 1)[0]
        if any(
            lowered.endswith(ext)
            for ext in (".mp4", ".mov", ".webm", ".m4v", ".mpeg", ".mpg")
        ):
            continue
        seen.add(url)
        out.append(url)
    return out


def can_publish_native_carousel(urls: list[str] | None) -> bool:
    return image_count(urls) >= 2


def strip_swipe_language(text: str) -> str:
    cleaned = (text or "").strip()
    if not cleaned:
        return ""
    for pattern in _SWIPE_PATTERNS:
        cleaned = pattern.sub(" ", cleaned)
    cleaned = _MULTI_SPACE.sub(" ", cleaned)
    cleaned = _MULTI_NL.sub("\n\n", cleaned)
    return cleaned.strip(" \n\t-–—")


def sanitize_copy(
    caption: str,
    call_to_action: str = "",
    *,
    allow_swipe: bool = False,
) -> tuple[str, str]:
    """Remove fake-carousel language unless a native carousel will publish."""
    if allow_swipe:
        return (caption or "").strip(), (call_to_action or "").strip()
    return (
        strip_swipe_language(caption),
        strip_swipe_language(call_to_action),
    )


def assign_slide_media(
    slides: list[dict],
    media_urls: list[str],
) -> list[dict]:
    """Attach one image per slide (round-robin) when images exist."""
    images = unique_image_urls(media_urls)
    if not slides:
        return []
    cleaned: list[dict] = []
    for index, slide in enumerate(slides):
        if not isinstance(slide, dict):
            continue
        caption = str(slide.get("caption") or "").strip()[:1000]
        if not caption:
            continue
        media = ""
        if images:
            media = images[index % len(images)]
        cleaned.append({
            "caption": caption,
            "media_url": media,
            "product_id": slide.get("product_id"),
        })
    return cleaned


def carousel_image_urls_from_content(content: Any) -> list[str]:
    """Prefer per-slide media, then fall back to content.media_urls."""
    urls: list[str] = []
    slides = content.slides if isinstance(getattr(content, "slides", None), list) else []
    for slide in slides:
        if isinstance(slide, dict) and slide.get("media_url"):
            urls.append(str(slide["media_url"]))
    media = getattr(content, "media_urls", None)
    if isinstance(media, list):
        urls.extend(str(u) for u in media if u)
    return unique_image_urls(urls)


def formats_for_channel(
    account: SocialAccount,
    *,
    image_count_n: int,
    organic: bool = False,
    primary_only: bool = False,
    reel_briefs: bool = False,
) -> list[tuple[str, str]]:
    """
    Honest format list for one connected account.

    - Carousel only when 2+ images are available.
    - Autopilot (primary_only): one piece per account.
    - Studio: post always; carousel when images allow.
    - Reel/story publish is not fully wired; reel_briefs adds a filmable
      skit brief when Kenya relatable mode is on (draft for the owner).
    """
    if account.platform == SocialAccount.Platform.FACEBOOK_PAGE:
        platform = "facebook"
    elif account.platform == SocialAccount.Platform.INSTAGRAM:
        platform = "instagram"
    else:
        return []

    if primary_only:
        if image_count_n >= 2:
            return [(platform, "carousel")]
        return [(platform, "post")]

    formats: list[tuple[str, str]] = [(platform, "post")]
    if image_count_n >= 2:
        formats.append((platform, "carousel"))
    if reel_briefs:
        formats.append((platform, "reel"))
    return formats


def merge_slide_captions_into_body(caption: str, slides: list) -> str:
    """
    When we cannot publish a native carousel, fold slide ideas into one
    caption instead of a numbered fake deck — and never say swipe.
    """
    body = strip_swipe_language(caption or "")
    bits: list[str] = []
    for slide in slides or []:
        if isinstance(slide, dict):
            text = str(slide.get("caption") or "").strip()
        else:
            text = str(slide or "").strip()
        text = strip_swipe_language(text)
        if text and text not in body and text not in bits:
            bits.append(text)
    if not bits:
        return body
    # Keep it short: at most 3 beats as flowing sentences, not a deck.
    extras = " ".join(bits[:3])
    if not body:
        return extras[:3800]
    if extras in body:
        return body
    return f"{body}\n\n{extras}"[:3800]
