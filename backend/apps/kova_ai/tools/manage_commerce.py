"""
Kova Commerce Management Tool.

Provides a unified commerce capability to the Kova Agent.
"""

from __future__ import annotations

from typing import Any

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .base import Tool
from .types import ToolResult, ToolStatus


class ManageCommerceTool(Tool):
    """Manage supported commerce operations."""

    @property
    def action(self) -> str:
        return DecisionAction.MANAGE_COMMERCE

    @property
    def description(self) -> str:
        return (
            "Perform a supported commerce operation involving products, "
            "orders, customers, or sales activity."
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
                        "get_order",
                        "get_customer",
                        "get_sales_summary",
                    ],
                },
                "resource_id": {
                    "type": "string",
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

        allowed_operations = {
            "get_product",
            "get_order",
            "get_customer",
            "get_sales_summary",
        }

        if operation not in allowed_operations:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="Unsupported commerce operation.",
            )

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Commerce operation accepted.",
            data={
                "business_id": context.business["id"],
                "operation": operation,
                "resource_id": arguments.get("resource_id"),
            },
        )