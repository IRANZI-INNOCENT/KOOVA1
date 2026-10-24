"""
Polish a saved product for the public store page.

The vision model looks at the product photos. The listing model rewrites
the words visitors read. Owner commercial facts stay as they were saved.
"""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any

from apps.commerce.models import Product, ProductAIAnalysis
from apps.commerce.services.business_context import CommerceBusinessContextService
from apps.commerce.services.product_vision import ProductVisionService
from apps.kova_ai.services.model_routes import resolve_model_for_task

logger = logging.getLogger(__name__)


def polish_product(product: Product) -> Product:
    """Rewrite visitor-facing fields and return the saved product."""

    from apps.kova_ai.services.usage import track_ai_usage

    with track_ai_usage("product_polish", product.business_id):
        vision = ProductVisionService()
        result = vision.polish(
            images=_image_payload(product),
            listing=_listing(product),
            business_context=CommerceBusinessContextService.build(product.business),
        )

        _apply(product, result)
        ProductAIAnalysis.objects.create(
            product=product,
            model=resolve_model_for_task("product_polish"),
            result=result,
            confidence=_confidence_percent(result.get("confidence")),
        )
        product.refresh_from_db()
        return product


def _image_payload(product: Product) -> list[tuple[str, bytes]]:
    payload: list[tuple[str, bytes]] = []
    images = product.images.all()[:3]
    for image in images:
        try:
            image.image.open("rb")
            payload.append((image.image.name, image.image.read()))
        except (OSError, ValueError):
            logger.warning("Could not read product image %s", image.pk)
        finally:
            try:
                image.image.close()
            except Exception:
                pass
    return payload


def _listing(product: Product) -> dict[str, Any]:
    return {
        "name": product.name,
        "category": product.category,
        "price": str(product.price) if product.price is not None else "",
        "currency": product.currency,
        "stock": product.stock,
        "sku": product.sku,
        "brand": product.brand,
        "material": product.material,
        "size": product.size,
        "color": product.color,
        "condition": product.condition,
        "offering_kind": product.offering_kind,
        "short_description": product.short_description,
        "description": product.description,
        "seo_title": product.seo_title,
        "seo_description": product.seo_description,
        "selling_points": product.selling_points,
    }


def _apply(product: Product, result: dict[str, Any]) -> None:
    name = str(result.get("name") or "").strip()
    if name and name.lower() != "unnamed product":
        product.name = name[:200]

    category = str(result.get("category") or "").strip()
    if category:
        product.category = category[:160]

    if not product.color:
        color = str(result.get("color") or "").strip()
        if color:
            product.color = color[:160]

    if not product.material:
        material = str(result.get("material") or "").strip()
        if material:
            product.material = material[:160]

    for field, limit in (
        ("short_description", None),
        ("description", None),
        ("seo_title", 220),
        ("seo_description", None),
        ("ai_summary", None),
    ):
        raw = result.get(field)
        if isinstance(raw, (list, tuple)):
            value = " ".join(str(item).strip() for item in raw if str(item).strip())
        else:
            value = str(raw or "")
        value = " ".join(value.replace("\\n", " ").split()).strip().strip('"')
        if value:
            setattr(product, field, value[:limit] if limit else value)

    points = result.get("selling_points") or []
    if points:
        product.selling_points = points
    keywords = result.get("keywords") or []
    if keywords:
        product.keywords = keywords

    visual = result.get("visual_attributes")
    if isinstance(visual, dict) and visual:
        product.visual_attributes = visual

    uncertain = result.get("uncertain_attributes") or []
    product.uncertain_attributes = uncertain

    confidence = result.get("confidence")
    if isinstance(confidence, (int, float)):
        product.ai_confidence = Decimal(str(round(float(confidence), 4)))

    product.ai_generated = True
    product.save()

    alt_text = str(result.get("alt_text") or "").strip()
    if alt_text:
        primary = (
            product.images.filter(is_primary=True).first()
            or product.images.first()
        )
        if primary is not None:
            primary.alt_text = alt_text[:300]
            primary.save(update_fields=["alt_text"])


def _confidence_percent(value: Any) -> Decimal | None:
    if not isinstance(value, (int, float)):
        return None
    return Decimal(str(round(float(value) * 100, 2)))
