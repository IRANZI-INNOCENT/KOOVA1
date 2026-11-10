"""Record public storefront interactions."""

from __future__ import annotations

from apps.commerce.models import CommercePage, Product, StorefrontEvent

_ALLOWED_KINDS = {
    StorefrontEvent.Kind.STORE_VIEW,
    StorefrontEvent.Kind.PRODUCT_VIEW,
    StorefrontEvent.Kind.WHATSAPP_HEADER,
    StorefrontEvent.Kind.WHATSAPP_PRODUCT,
    StorefrontEvent.Kind.SEARCH,
    StorefrontEvent.Kind.FILTER,
}


def record_storefront_event(
    *,
    slug: str,
    kind: str,
    product_slug: str | None = None,
    path: str = "",
    meta: dict | None = None,
) -> StorefrontEvent | None:
    page = (
        CommercePage.objects.filter(slug=slug, is_published=True)
        .select_related("business")
        .first()
    )
    if page is None:
        return None
    if kind not in _ALLOWED_KINDS:
        return None

    product = None
    if product_slug:
        product = Product.objects.filter(
            business_id=page.business_id,
            slug=product_slug,
            status=Product.Status.ACTIVE,
        ).first()

    return StorefrontEvent.objects.create(
        business_id=page.business_id,
        product=product,
        kind=kind,
        path=(path or "")[:300],
        meta=meta or {},
    )
