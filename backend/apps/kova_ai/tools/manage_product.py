"""
Kova Product Management Tool.

Performs real CRUD operations on Product records. Creates, updates,
and archives products in the database.

This tool writes to the database.
"""

from __future__ import annotations

import logging
from decimal import Decimal, InvalidOperation
from typing import Any

from apps.commerce.models import Product
from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .base import Tool
from .types import ToolResult, ToolStatus

logger = logging.getLogger(__name__)


class ManageProductTool(Tool):
    """Manage a business product."""

    @property
    def action(self) -> str:
        return DecisionAction.MANAGE_PRODUCT

    @property
    def description(self) -> str:
        return (
            "Create, update, or archive a business product. "
            "Products are real business assets stored in the database."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": ["create", "update", "archive"],
                    "description": "The product operation to perform.",
                },
                "product_id": {
                    "type": "integer",
                    "description": "The database ID of the product (required for update/archive).",
                },
                "name": {
                    "type": "string",
                    "description": "Product name (required for create).",
                },
                "category": {
                    "type": "string",
                },
                "price": {
                    "type": "number",
                    "description": "Product price.",
                },
                "currency": {
                    "type": "string",
                    "description": "Currency code (default: KES).",
                },
                "brand": {
                    "type": "string",
                },
                "description": {
                    "type": "string",
                },
                "sku": {
                    "type": "string",
                },
                "stock": {
                    "type": "integer",
                },
            },
            "required": ["operation"],
            "additionalProperties": False,
        }

    def execute(
        self,
        *,
        decision: Decision,
        context: BusinessContext,
        arguments: dict[str, Any] | None = None,
    ) -> ToolResult:
        """Execute the product operation against the database."""

        arguments = arguments or {}
        operation = arguments.get("operation")
        business_id = context.business["id"]

        if operation == "create":
            return self._create(business_id, arguments)
        elif operation == "update":
            return self._update(business_id, arguments)
        elif operation == "archive":
            return self._archive(business_id, arguments)
        else:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="Unsupported product operation. Use create, update, or archive.",
            )

    def _create(self, business_id: int, arguments: dict[str, Any]) -> ToolResult:
        name = arguments.get("name")
        if not isinstance(name, str) or not name.strip():
            return ToolResult(
                status=ToolStatus.FAILED,
                message="Product name is required for creation.",
            )

        price = self._parse_price(arguments.get("price"))

        try:
            product = Product.objects.create(
                business_id=business_id,
                name=name.strip(),
                category=arguments.get("category", "").strip() if isinstance(arguments.get("category"), str) else "",
                price=price,
                currency=arguments.get("currency", "KES").strip() if isinstance(arguments.get("currency"), str) else "KES",
                brand=arguments.get("brand", "").strip() if isinstance(arguments.get("brand"), str) else "",
                sku=arguments.get("sku", "").strip() if isinstance(arguments.get("sku"), str) else "",
                stock=arguments.get("stock") if isinstance(arguments.get("stock"), int) else None,
                status=Product.Status.DRAFT,
            )
            from apps.commerce.services.storefront import (
                publish_product_on_store,
                store_paths,
            )

            page = publish_product_on_store(product)
            product.refresh_from_db()
            paths = store_paths(page, product)
        except Exception as exc:
            logger.error("Failed to create product for business %s: %s", business_id, exc)
            return ToolResult(
                status=ToolStatus.FAILED,
                message=f"Failed to create product: {exc}",
            )

        # Verify persistence
        if not Product.objects.filter(pk=product.pk).exists():
            return ToolResult(
                status=ToolStatus.FAILED,
                message="Product was not persisted to the database.",
            )

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message=(
                f"Product '{product.name}' is live on the store at {paths['product_path']}."
            ),
            data={
                "product_id": product.pk,
                "name": product.name,
                "slug": product.slug,
                "price": str(product.price) if product.price else None,
                "status": product.status,
                "store_path": paths["store_path"],
                "product_path": paths["product_path"],
            },
        )

    def _update(self, business_id: int, arguments: dict[str, Any]) -> ToolResult:
        product_id = arguments.get("product_id")
        if product_id is None:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="product_id is required for update.",
            )

        try:
            product = Product.objects.get(pk=int(product_id), business_id=business_id)
        except Product.DoesNotExist:
            return ToolResult(
                status=ToolStatus.FAILED,
                message=f"Product {product_id} not found for this business.",
            )

        update_fields = []
        if isinstance(arguments.get("name"), str) and arguments["name"].strip():
            product.name = arguments["name"].strip()
            update_fields.append("name")

        if isinstance(arguments.get("category"), str):
            product.category = arguments["category"].strip()
            update_fields.append("category")

        if isinstance(arguments.get("brand"), str):
            product.brand = arguments["brand"].strip()
            update_fields.append("brand")

        if isinstance(arguments.get("sku"), str):
            product.sku = arguments["sku"].strip()
            update_fields.append("sku")

        if isinstance(arguments.get("currency"), str):
            product.currency = arguments["currency"].strip()
            update_fields.append("currency")

        if arguments.get("price") is not None:
            price = self._parse_price(arguments["price"])
            if price is not None:
                product.price = price
                update_fields.append("price")

        if isinstance(arguments.get("stock"), int):
            product.stock = arguments["stock"]
            update_fields.append("stock")

        if not update_fields:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="No valid fields provided for update.",
            )

        try:
            product.save(update_fields=update_fields + ["updated_at"])
        except Exception as exc:
            logger.error("Failed to update product %s: %s", product_id, exc)
            return ToolResult(
                status=ToolStatus.FAILED,
                message=f"Failed to update product: {exc}",
            )

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message=f"Product '{product.name}' updated.",
            data={
                "product_id": product.pk,
                "name": product.name,
                "updated_fields": update_fields,
            },
        )

    def _archive(self, business_id: int, arguments: dict[str, Any]) -> ToolResult:
        product_id = arguments.get("product_id")
        if product_id is None:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="product_id is required for archive.",
            )

        try:
            product = Product.objects.get(pk=int(product_id), business_id=business_id)
        except Product.DoesNotExist:
            return ToolResult(
                status=ToolStatus.FAILED,
                message=f"Product {product_id} not found for this business.",
            )

        if product.status == Product.Status.ARCHIVED:
            return ToolResult(
                status=ToolStatus.SUCCESS,
                message="Product is already archived.",
                data={"product_id": product.pk, "status": product.status},
            )

        product.status = Product.Status.ARCHIVED
        product.save(update_fields=["status", "updated_at"])

        # Verify
        product.refresh_from_db()
        if product.status != Product.Status.ARCHIVED:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="Failed to archive product.",
            )

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message=f"Product '{product.name}' archived.",
            data={"product_id": product.pk, "status": product.status},
        )

    @staticmethod
    def _parse_price(value: Any) -> Decimal | None:
        if value is None:
            return None
        try:
            price = Decimal(str(value))
            if price < 0:
                return None
            return price
        except (InvalidOperation, TypeError, ValueError):
            return None
