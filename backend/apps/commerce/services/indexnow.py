"""
Notify Bing / Yandex / IndexNow partners when public store URLs change.

Requires INDEXNOW_KEY on the API service and the matching key file on the
site host at /indexnow-key.txt (served by Next.js).
"""

from __future__ import annotations

import logging
import os
from urllib.parse import urlparse

import requests

logger = logging.getLogger(__name__)

INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"


def frontend_origin() -> str:
    return os.getenv("FRONTEND_URL", "http://localhost:3000").strip().rstrip("/")


def indexnow_enabled() -> bool:
    key = os.getenv("INDEXNOW_KEY", "").strip()
    if not key:
        return False
    if os.getenv("INDEXNOW_DISABLED", "").strip().lower() in ("1", "true", "yes"):
        return False
    return True


def store_url(slug: str) -> str:
    return f"{frontend_origin()}/store/{slug}"


def product_url(slug: str, product_slug: str) -> str:
    return f"{frontend_origin()}/store/{slug}/{product_slug}"


def notify_urls(urls: list[str]) -> bool:
    """
    Submit unique absolute URLs to IndexNow. Failures are logged, never raised,
    so publish flows stay reliable offline / without the key.
    """
    if not indexnow_enabled():
        return False

    key = os.getenv("INDEXNOW_KEY", "").strip()
    origin = frontend_origin()
    host = urlparse(origin).hostname or ""
    if not host:
        logger.warning("IndexNow skipped: FRONTEND_URL has no host.")
        return False

    cleaned: list[str] = []
    seen: set[str] = set()
    for raw in urls:
        url = (raw or "").strip()
        if not url or url in seen:
            continue
        if not url.startswith(origin):
            continue
        seen.add(url)
        cleaned.append(url)

    if not cleaned:
        return False

    key_location = f"{origin}/indexnow-key.txt"
    payload = {
        "host": host,
        "key": key,
        "keyLocation": key_location,
        "urlList": cleaned[:10000],
    }

    try:
        response = requests.post(
            INDEXNOW_ENDPOINT,
            json=payload,
            timeout=12,
            headers={"Content-Type": "application/json; charset=utf-8"},
        )
    except requests.RequestException as exc:
        logger.warning("IndexNow request failed: %s", exc)
        return False

    if response.status_code in (200, 202):
        logger.info("IndexNow accepted %s URL(s).", len(cleaned))
        return True

    logger.warning(
        "IndexNow rejected submit (%s): %s",
        response.status_code,
        (response.text or "")[:300],
    )
    return False


def notify_store_page(page) -> bool:
    """Ping the store URL and all active product URLs for a CommercePage."""
    from apps.commerce.models import Product

    if page is None or not getattr(page, "is_published", False):
        return False

    urls = [store_url(page.slug)]
    products = Product.objects.filter(
        business_id=page.business_id,
        status=Product.Status.ACTIVE,
    ).only("slug")
    for product in products:
        if product.slug:
            urls.append(product_url(page.slug, product.slug))
    return notify_urls(urls)


def notify_product(product, page=None) -> bool:
    from apps.commerce.models import CommercePage, Product

    if product is None or product.status != Product.Status.ACTIVE:
        return False

    if page is None:
        page = CommercePage.objects.filter(
            business_id=product.business_id,
            is_published=True,
        ).first()
    if page is None:
        return False

    return notify_urls([
        store_url(page.slug),
        product_url(page.slug, product.slug),
    ])
