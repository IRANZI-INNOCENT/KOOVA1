"""
Kova Commerce Management Tool.

Reads real data from commerce models. This is the read-side companion
to ManageProductTool and ManageOrderTool.
"""

from __future__ import annotations

from typing import Any

from apps.commerce.models import CommercePage, Product
from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .base import Tool
from .types import ToolResult, ToolStatus


class ManageCommerceTool(Tool):
    """Query commerce data for a business."""

    @property
    def action(self) -> str:
        return DecisionAction.MANAGE_COMMERCE

    @property
    def description(self) -> str:
        return (
            "Query commerce information: products, orders, customers, "
            "or sales activity from real business data."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": [
                        "get_product",
                        "list_products",
                        "get_commerce_page",
                        "get_sales_summary",
                    ],
                },
                "resource_id": {
                    "type": "integer",
                    "description": "ID of a specific resource to fetch.",
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
        arguments = arguments or {}
        operation = arguments.get("operation")
        business_id = context.business["id"]

        if operation == "get_product":
            return self._get_product(business_id, arguments)
        elif operation == "list_products":
            return self._list_products(business_id)
        elif operation == "get_commerce_page":
            return self._get_commerce_page(business_id)
        elif operation == "get_sales_summary":
            return self._get_sales_summary(business_id)
        else:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="Unsupported commerce operation.",
            )

    def _get_product(self, business_id: int, arguments: dict[str, Any]) -> ToolResult:
        resource_id = arguments.get("resource_id")
        if resource_id is None:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="resource_id is required to get a product.",
            )

        try:
            product = Product.objects.get(pk=int(resource_id), business_id=business_id)
        except Product.DoesNotExist:
            return ToolResult(
                status=ToolStatus.FAILED,
                message=f"Product {resource_id} not found.",
            )

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Product retrieved.",
            data={
                "product": {
                    "id": product.pk,
                    "name": product.name,
                    "category": product.category,
                    "price": str(product.price) if product.price else None,
                    "currency": product.currency,
                    "stock": product.stock,
                    "status": product.status,
                    "description": product.description,
                    "short_description": product.short_description,
                },
            },
        )

    def _list_products(self, business_id: int) -> ToolResult:
        products = Product.objects.filter(
            business_id=business_id,
        ).exclude(
            status=Product.Status.ARCHIVED,
        ).order_by("-updated_at")[:50]

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message=f"Found {len(products)} products.",
            data={
                "products": [
                    {
                        "id": p.pk,
                        "name": p.name,
                        "price": str(p.price) if p.price else None,
                        "status": p.status,
                    }
                    for p in products
                ],
            },
        )

    def _get_commerce_page(self, business_id: int) -> ToolResult:
        try:
            page = CommercePage.objects.get(business_id=business_id)
        except CommercePage.DoesNotExist:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="No commerce page found for this business.",
            )

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Commerce page retrieved.",
            data={
                "commerce_page": {
                    "id": page.pk,
                    "slug": page.slug,
                    "title": page.title,
                    "tagline": page.tagline,
                    "is_published": page.is_published,
                },
            },
        )

    def _get_sales_summary(self, business_id: int) -> ToolResult:
        total = Product.objects.filter(business_id=business_id).count()
        active = Product.objects.filter(
            business_id=business_id,
            status=Product.Status.ACTIVE,
        ).count()
        drafts = Product.objects.filter(
            business_id=business_id,
            status=Product.Status.DRAFT,
        ).count()

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Sales summary retrieved.",
            data={
                "total_products": total,
                "active_products": active,
                "draft_products": drafts,
            },
        )
