"""
KCOVA Order Management Tool.

Updates store order fulfilment state. Payment refunds are not supported.
"""

from __future__ import annotations

from typing import Any

from apps.commerce.models import Order
from apps.commerce.services.orders import OrderUpdateError, apply_order_update
from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .base import Tool
from .types import ToolResult, ToolStatus

_OPERATIONS = frozenset(
    {"view", "confirm", "cancel", "refund", "update_status"},
)


class ManageOrderTool(Tool):
    """Manage a business order."""

    @property
    def action(self) -> str:
        return DecisionAction.MANAGE_ORDER

    @property
    def description(self) -> str:
        return (
            "Manage an existing customer order, including reviewing or "
            "updating its business-controlled state."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": [
                        "view",
                        "confirm",
                        "cancel",
                        "refund",
                        "update_status",
                    ],
                },
                "order_id": {
                    "type": "string",
                },
                "status": {
                    "type": "string",
                },
            },
            "required": [
                "operation",
                "order_id",
            ],
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
        order_id = arguments.get("order_id")

        if operation not in _OPERATIONS:
            return self._failure("Unsupported order operation.")

        if not isinstance(order_id, str) or not order_id.strip():
            return self._failure("A valid order_id is required.")

        if operation == "refund":
            return self._failure(
                "Payment refunds are not enabled. Update fulfilment status only.",
            )

        try:
            pk = int(order_id.strip())
        except ValueError:
            return self._failure("order_id must be a numeric id.")

        business_id = context.business["id"]
        try:
            order = Order.objects.select_related("product").get(
                pk=pk,
                business_id=business_id,
            )
        except Order.DoesNotExist:
            return self._failure(f"Order {pk} not found.")

        if operation == "view":
            return ToolResult(
                status=ToolStatus.SUCCESS,
                message="Order retrieved.",
                data={"order": self._order_payload(order)},
            )

        status_map = {
            "confirm": Order.Status.CONFIRMED,
            "cancel": Order.Status.CANCELLED,
        }
        new_status = status_map.get(operation)
        if operation == "update_status":
            raw = arguments.get("status")
            if not isinstance(raw, str) or not raw.strip():
                return self._failure("status is required for update_status.")
            new_status = raw.strip()
            if new_status == "fulfilled":
                new_status = Order.Status.DELIVERED

        if new_status is None:
            return self._failure("Unsupported order operation.")

        try:
            updated = apply_order_update(order, data={"status": new_status})
        except OrderUpdateError as exc:
            return self._failure(str(exc))

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message=f"Order updated to {updated.status}.",
            data={"order": self._order_payload(updated)},
        )

    @staticmethod
    def _order_payload(order: Order) -> dict[str, Any]:
        product = order.product
        return {
            "id": order.pk,
            "status": order.status,
            "quantity": order.quantity,
            "customer_name": order.customer_name,
            "phone": order.phone,
            "source": order.source,
            "product_id": product.pk if product else None,
            "product_name": product.name if product else None,
            "note": (order.note or "")[:300],
            "created_at": order.created_at.isoformat(),
            "updated_at": order.updated_at.isoformat(),
        }

    @staticmethod
    def _failure(message: str) -> ToolResult:
        return ToolResult(
            status=ToolStatus.FAILED,
            message=message,
        )
