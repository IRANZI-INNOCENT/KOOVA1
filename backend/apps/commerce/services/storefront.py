"""
Publish a business store when a product is added.

Kova is the store. Adding a product should give the business a public
catalog and a page for that product, without a separate commerce tool.
"""

from __future__ import annotations

import os

from apps.commerce.models import CommercePage, Product
from apps.commerce.services.commerce_page import get_or_create_commerce_page


def publish_product_on_store(product: Product) -> CommercePage:
    """
    Publish the business store and list this product on it.

    Contact details are copied from the business when the store page
    does not already have them, so customers can order immediately.
    Archived products stay off the public catalog.
    """

    business = product.business
    page = get_or_create_commerce_page(business)
    updates: list[str] = []

    if not page.title:
        page.title = business.name
        updates.append("title")

    if not page.tagline:
        page.tagline = f"Shop {business.name}"
        updates.append("tagline")

    if not page.description and business.description:
        page.description = business.description
        updates.append("description")

    if not page.email and business.email:
        page.email = business.email
        updates.append("email")

    if not page.phone and business.phone:
        page.phone = business.phone
        updates.append("phone")

    if not page.whatsapp and (page.phone or business.phone):
        page.whatsapp = page.phone or business.phone
        updates.append("whatsapp")

    if not page.location and business.location:
        page.location = business.location
        updates.append("location")

    if not page.is_published:
        page.is_published = True
        updates.append("is_published")

    if updates:
        updates.append("updated_at")
        page.save(update_fields=updates)

    if product.status != Product.Status.ARCHIVED and product.status != Product.Status.ACTIVE:
        product.status = Product.Status.ACTIVE
        product.save(update_fields=["status", "updated_at"])

    try:
        from apps.commerce.services.indexnow import notify_product

        notify_product(product, page=page)
    except Exception:
        # Indexing must never block publishing.
        pass

    return page


def store_paths(page: CommercePage | None, product: Product | None = None) -> dict[str, str | None]:
    """Relative public paths the storefront frontend can open."""

    if page is None or not page.is_published:
        return {
            "store_path": None,
            "product_path": None,
        }

    store_path = f"/store/{page.slug}"
    product_path = None

    if product is not None and product.status == Product.Status.ACTIVE and product.slug:
        product_path = f"{store_path}/{product.slug}"

    return {
        "store_path": store_path,
        "product_path": product_path,
    }


def absolute_api_base() -> str:
    """Public base URL for API-hosted assets (e.g. /media/ uploads)."""
    explicit = os.getenv("API_PUBLIC_URL", "").strip().rstrip("/")
    if explicit:
        return explicit if explicit.startswith("http") else f"https://{explicit}"
    domain = os.getenv("RAILWAY_PUBLIC_DOMAIN", "").strip()
    if domain:
        return f"https://{domain}"
    return os.getenv("FRONTEND_URL", "http://localhost:8000").rstrip("/")


def absolute_media_url(url: str) -> str:
    """Turn a stored media path into a URL Meta can fetch."""
    raw = (url or "").strip()
    if not raw:
        return ""
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    base = absolute_api_base()
    path = raw if raw.startswith("/") else f"/{raw.lstrip('/')}"
    return f"{base.rstrip('/')}{path}"


def absolute_product_url(product: Product | None) -> str:
    """Full public address for one product page."""

    if product is None:
        return ""
    page = CommercePage.objects.filter(business_id=product.business_id).first()
    path = store_paths(page, product).get("product_path")
    if not path:
        return ""
    base = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return f"{base}{path}"


def append_product_link(text: str, product: Product | None) -> str:
    """Add the product page once, when this piece is about a product."""

    link = absolute_product_url(product)
    body = (text or "").strip()
    if not link or link in body:
        return body
    if not body:
        return link
    return f"{body}\n\n{link}"
