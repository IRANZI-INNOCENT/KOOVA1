"""Build public storefront URLs for admin and notifications."""

from __future__ import annotations

from django.conf import settings


def frontend_base_url() -> str:
    return (getattr(settings, "FRONTEND_URL", "") or "http://localhost:3000").rstrip(
        "/"
    )


def commerce_page_url(page) -> str:
    """Absolute public URL for a commerce page, or empty if no slug."""
    slug = (getattr(page, "slug", None) or "").strip()
    if not slug:
        return ""
    return f"{frontend_base_url()}/store/{slug}"


def business_store_url(business) -> str:
    page = getattr(business, "commerce_page", None)
    if page is None:
        try:
            from apps.commerce.models import CommercePage

            page = CommercePage.objects.filter(business=business).first()
        except Exception:
            return ""
    if page is None:
        return ""
    return commerce_page_url(page)
