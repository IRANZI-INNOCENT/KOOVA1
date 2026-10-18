"""Validation helpers for storefront branding."""

from __future__ import annotations

import re

from django.utils.text import slugify

HEX_COLOR = re.compile(r"^#([0-9A-Fa-f]{6})$")

RESERVED_SLUGS = frozenset({
    "api",
    "admin",
    "store",
    "guides",
    "for",
    "login",
    "signup",
    "workspace",
    "privacy",
    "terms",
    "cookies",
    "ai",
    "offline",
    "sitemap",
    "robots",
    "llms",
    "indexnow-key",
    "media",
    "static",
})


def normalize_hex_color(value: str, *, default: str) -> str:
    raw = (value or "").strip()
    if not raw:
        return default
    if not raw.startswith("#"):
        raw = f"#{raw}"
    if not HEX_COLOR.match(raw):
        raise ValueError("Use a color like #176B4D.")
    return raw.upper()


def normalize_store_slug(value: str) -> str:
    cleaned = slugify((value or "").strip())[:160]
    if len(cleaned) < 2:
        raise ValueError("Store link needs at least 2 letters or numbers.")
    if cleaned in RESERVED_SLUGS:
        raise ValueError("That store link is reserved. Choose another.")
    return cleaned
