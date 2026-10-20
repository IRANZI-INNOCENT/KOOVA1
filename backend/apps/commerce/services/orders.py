"""Order status transitions, stock adjustments, and review drafts."""

from __future__ import annotations

from django.db import transaction
from django.db.models import F

from apps.commerce.models import Order, Product

# Statuses that mean stock has left the shelf (or is reserved).
STOCK_HELD = {
    Order.Status.CONFIRMED,
    Order.Status.PACKING,
    Order.Status.OUT_FOR_DELIVERY,
    Order.Status.DELIVERED,
}


class OrderUpdateError(Exception):
    """Raised when an order status change is not allowed."""


def apply_order_update(order: Order, *, data: dict) -> Order:
    """
    Apply status and fulfillment fields from a PATCH payload.

    Handles stock decrement on first confirm and restore on cancel.
    """
    with transaction.atomic():
        locked = Order.objects.select_for_update().select_related("product").get(pk=order.pk)
        previous = locked.status

        if "customer_name" in data and data.get("customer_name") is not None:
            locked.customer_name = str(data.get("customer_name") or "")[:200]
        if "phone" in data and data.get("phone") is not None:
            locked.phone = str(data.get("phone") or "")[:30]
        if "note" in data:
            locked.note = str(data.get("note") or "")[:2000]
        if "customer_address" in data:
            locked.customer_address = str(data.get("customer_address") or "")[:400]
        if "delivery_note" in data:
            locked.delivery_note = str(data.get("delivery_note") or "")[:400]
        if "rider_name" in data:
            locked.rider_name = str(data.get("rider_name") or "")[:120]

        status_value = data.get("status")
        if status_value is not None:
            if status_value == "fulfilled":
                status_value = Order.Status.DELIVERED
            if status_value not in Order.Status.values:
                raise OrderUpdateError("Unknown order status.")
            _transition_status(locked, previous, status_value)

        locked.save()
        return locked


def _transition_status(order: Order, previous: str, new_status: str) -> None:
    if previous == new_status:
        return

    entering_held = new_status in STOCK_HELD and previous not in STOCK_HELD
    leaving_held = previous in STOCK_HELD and new_status == Order.Status.CANCELLED

    if entering_held and not order.stock_adjusted:
        _decrement_stock(order)
    if leaving_held and order.stock_adjusted:
        _restore_stock(order)

    order.status = new_status

    if new_status == Order.Status.DELIVERED and not (order.review_ask_draft or "").strip():
        order.review_ask_draft = build_review_ask_draft(order)


def _decrement_stock(order: Order) -> None:
    product = order.product
    if product is None or product.stock is None:
        order.stock_adjusted = True
        return

    qty = max(1, int(order.quantity or 1))
    locked = Product.objects.select_for_update().get(pk=product.pk)
    if locked.stock is None:
        order.stock_adjusted = True
        return
    if locked.stock < qty:
        raise OrderUpdateError(
            f"Not enough stock for {locked.name}. Available: {locked.stock}."
        )
    Product.objects.filter(pk=locked.pk).update(stock=F("stock") - qty)
    order.stock_adjusted = True


def _restore_stock(order: Order) -> None:
    product = order.product
    if product is None or product.stock is None:
        order.stock_adjusted = False
        return
    qty = max(1, int(order.quantity or 1))
    Product.objects.filter(pk=product.pk, stock__isnull=False).update(
        stock=F("stock") + qty,
    )
    order.stock_adjusted = False


def build_review_ask_draft(order: Order) -> str:
    name = (order.customer_name or "").strip() or "there"
    product = order.product.name if order.product_id else "your order"
    business = order.business.name
    return (
        f"Hi {name}, hope you're enjoying {product} from {business}. "
        f"If you have a moment, a short review or photo would mean a lot — "
        f"it helps other customers trust us. Asante!"
    )


def low_stock_products(business, *, threshold: int = 2) -> list[dict]:
    rows = (
        Product.objects.filter(
            business=business,
            status=Product.Status.ACTIVE,
            stock__isnull=False,
            stock__lte=threshold,
        )
        .order_by("stock", "name")
        .values("id", "name", "stock", "currency", "price")[:12]
    )
    return [
        {
            "id": row["id"],
            "name": row["name"],
            "stock": row["stock"],
            "price": str(row["price"]) if row["price"] is not None else None,
            "currency": row["currency"],
        }
        for row in rows
    ]
