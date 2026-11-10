"""Rules for listing a product on the public store."""

from __future__ import annotations

from apps.commerce.models import Product


class ProductActivationError(Exception):
    """Raised when a product cannot go active on the store."""


def product_ready_for_store(product: Product) -> bool:
    """Return whether the product may be listed as active."""

    if not (product.name or "").strip():
        return False
    if product.offering_kind == Product.OfferingKind.SERVICE:
        return True
    return product.price is not None


def assert_ready_for_active(product: Product) -> None:
    """
    Enforce owner-provided facts before activation.

    AI must not activate a product without a price the owner set.
    """

    if not (product.name or "").strip():
        raise ProductActivationError("Add a product name before you list it.")

    if (
        product.offering_kind == Product.OfferingKind.PRODUCT
        and product.price is None
    ):
        raise ProductActivationError(
            "Set a price before you list this product on your store."
        )
