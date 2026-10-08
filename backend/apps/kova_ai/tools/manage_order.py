"""
Kova Order Management Tool.
"""

from __future__ import annotations

from typing import Any

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .base import Tool
from .types import ToolResult, ToolStatus


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

        if operation not in {
            "view",
            "confirm",
            "cancel",
            "refund",
            "update_status",
        }:
            return self._failure("Unsupported order operation.")

        if not isinstance(order_id, str) or not order_id.strip():
            return self._failure("A valid order_id is required.")

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message=f"Order {operation} request accepted.",
            data={
                "business_id": context.business["id"],
                "order_id": order_id.strip(),
                "operation": operation,
                "status": arguments.get("status"),
            },
        )

    @staticmethod
    def _failure(message: str) -> ToolResult:
        return ToolResult(
            status=ToolStatus.FAILED,
            message=message,
        )