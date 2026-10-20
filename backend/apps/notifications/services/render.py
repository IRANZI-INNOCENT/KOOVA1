"""Single shared KCOVA email template renderer."""

from __future__ import annotations

from dataclasses import dataclass, field

from django.conf import settings
from django.template.loader import render_to_string

from apps.notifications.kinds import CATEGORY_LABEL


@dataclass
class EmailContent:
    category: str
    title: str
    subject: str
    preheader: str = ""
    greeting: str = ""
    paragraphs: list[str] = field(default_factory=list)
    bullets: list[str] = field(default_factory=list)
    stats: list[dict] = field(default_factory=list)
    cta_label: str = ""
    cta_url: str = ""
    secondary_label: str = ""
    secondary_url: str = ""
    footer_context: str = ""
    prefs_url: str = ""


def site_base_url() -> str:
    return (getattr(settings, "FRONTEND_URL", None) or "https://ai.kcova.com").rstrip("/")


def render_email(content: EmailContent) -> tuple[str, str]:
    site = site_base_url()
    context = {
        "category_label": CATEGORY_LABEL.get(content.category, content.category.title()),
        "title": content.title,
        "preheader": content.preheader or content.title,
        "greeting": content.greeting,
        "paragraphs": content.paragraphs,
        "bullets": content.bullets,
        "stats": content.stats,
        "cta_label": content.cta_label,
        "cta_url": content.cta_url,
        "secondary_label": content.secondary_label,
        "secondary_url": content.secondary_url,
        "footer_context": content.footer_context,
        "prefs_url": content.prefs_url,
        "site_url": site,
        "site_url_label": site.replace("https://", "").replace("http://", ""),
    }
    html = render_to_string("email/base.html", context)
    text = render_to_string("email/base.txt", context)
    return html, text
