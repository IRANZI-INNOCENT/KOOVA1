"""Manual and automatic stock adjustments with an audit trail."""

from __future__ import annotations

from django.db import transaction
from django.db.models import F

from apps.commerce.models import Order, Product, ProductStockAdjustment


class StockAdjustmentError(Exception):
    """Raised when stock cannot be updated."""


def log_stock_change(
    *,
    product: Product,
    previous: int | None,
    new: int | None,
    reason: str,
    note: str = "",
    order: Order | None = None,
) -> ProductStockAdjustment:
    delta = 0
    if previous is not None and new is not None:
        delta = new - previous
    elif previous is None and new is not None:
        delta = new
    elif previous is not None and new is None:
        delta = -previous

    return ProductStockAdjustment.objects.create(
        business=product.business,
        product=product,
        order=order,
        previous_stock=previous,
        new_stock=new,
        delta=delta,
        reason=reason,
        note=(note or "")[:400],
    )


@transaction.atomic
def set_product_stock(
    product: Product,
    *,
    stock: int | None,
    reason: str = ProductStockAdjustment.Reason.MANUAL,
    note: str = "",
) -> Product:
    if stock is not None and stock < 0:
        raise StockAdjustmentError("Stock cannot be negative.")

    locked = Product.objects.select_for_update().get(pk=product.pk)
    previous = locked.stock
    if previous == stock:
        return locked

    locked.stock = stock
    locked.save(update_fields=["stock", "updated_at"])
    log_stock_change(
        product=locked,
        previous=previous,
        new=stock,
        reason=reason,
        note=note,
    )
    return locked


@transaction.atomic
def apply_stock_delta(
    product: Product,
    *,
    delta: int,
    reason: str,
    note: str = "",
    order: Order | None = None,
) -> Product:
    if delta == 0:
        return product

    locked = Product.objects.select_for_update().get(pk=product.pk)
    previous = locked.stock
    if previous is None:
        raise StockAdjustmentError(
            f"{locked.name} does not track stock quantities."
        )
    new_value = previous + delta
    if new_value < 0:
        raise StockAdjustmentError(
            f"Not enough stock for {locked.name}. Available: {previous}."
        )
    Product.objects.filter(pk=locked.pk).update(stock=F("stock") + delta)
    locked.refresh_from_db()
    log_stock_change(
        product=locked,
        previous=previous,
        new=locked.stock,
        reason=reason,
        note=note,
        order=order,
    )
    return locked
