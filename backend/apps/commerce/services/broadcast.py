"""WhatsApp Status / group broadcast drafts from recent catalog updates."""

from __future__ import annotations

import json
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from apps.commerce.models import CommercePage, Product


def build_broadcast_pack(business, *, polish: bool = False) -> dict:
    since = timezone.now() - timedelta(hours=36)
    products = list(
        Product.objects.filter(
            business=business,
            status=Product.Status.ACTIVE,
            updated_at__gte=since,
        ).order_by("-updated_at")[:8]
    )
    if not products:
        products = list(
            Product.objects.filter(
                business=business,
                status=Product.Status.ACTIVE,
            ).order_by("-updated_at")[:5]
        )

    page = CommercePage.objects.filter(business=business).first()
    site = (getattr(settings, "FRONTEND_URL", "") or "").rstrip("/")
    store_url = ""
    if page and page.slug and page.is_published and site:
        store_url = f"{site}/store/{page.slug}"

    names = [product.name for product in products if product.name]
    if not names:
        status_text = f"New from {business.name} — message us for today's stock."
        group_text = status_text
    else:
        listed = ", ".join(names[:4])
        more = f" +{len(names) - 4} more" if len(names) > 4 else ""
        status_text = f"{business.name}: {listed}{more}. DM to order."
        lines = [f"Fresh from {business.name}:"]
        for product in products[:6]:
            price = ""
            if product.price is not None:
                price = f" — {product.currency} {product.price}"
            stock = ""
            if product.stock is not None:
                stock = " (in stock)" if product.stock > 0 else " (limited)"
            lines.append(f"• {product.name}{price}{stock}")
        if store_url:
            lines.append(f"Browse: {store_url}")
        lines.append("Reply here to order on WhatsApp.")
        group_text = "\n".join(lines)

    if polish and names:
        polished = _optional_polish(business, status_text, group_text)
        if polished:
            status_text = polished.get("status_text") or status_text
            group_text = polished.get("group_text") or group_text

    return {
        "status_text": status_text[:700],
        "group_text": group_text[:2000],
        "product_count": len(products),
        "store_url": store_url,
    }


def _optional_polish(business, status_text: str, group_text: str) -> dict | None:
    try:
        from apps.kova_ai.services.openrouter import OpenRouterService
        from apps.kova_ai.services.usage import track_ai_usage

        with track_ai_usage("broadcast_pack", business.id):
            response = OpenRouterService(timeout=30).chat(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Tighten WhatsApp Status and group texts for a Kenyan SME. "
                            "Keep facts. No invented prices. JSON only with status_text and group_text."
                        ),
                    },
                    {
                        "role": "user",
                        "content": json.dumps(
                            {
                                "business": business.name,
                                "status_text": status_text,
                                "group_text": group_text,
                            }
                        ),
                    },
                ],
                temperature=0.4,
                max_tokens=500,
                response_format={"type": "json_object"},
                feature="broadcast_pack",
                business_id=business.id,
            )
        raw = response["choices"][0]["message"]["content"]
        if not isinstance(raw, str):
            return None
        parsed = json.loads(raw)
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        return None
    return None
