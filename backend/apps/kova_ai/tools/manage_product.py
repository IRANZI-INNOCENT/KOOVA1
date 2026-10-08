"""
Kova Product Management Tool.
"""

from __future__ import annotations

from typing import Any

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .base import Tool
from .types import ToolResult, ToolStatus


class ManageProductTool(Tool):
    """Manage a business product."""

    @property
    def action(self) -> str:
        return DecisionAction.MANAGE_PRODUCT

    @property
    def description(self) -> str:
        return (
            "Create, update, or otherwise manage a business product."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "enum": ["create", "update", "archive"],
                },
                "product_id": {
                    "type": "string",
                },
                "name": {
                    "type": "string",
                },
                "description": {
                    "type": "string",
                },
                "price": {
                    "type": "number",
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

        if operation not in {"create", "update", "archive"}:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="Unsupported product operation.",
            )

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message=f"Product {operation} request accepted.",
            data={
                "business_id": context.business["id"],
                "operation": operation,
                "product_id": arguments.get("product_id"),
                "name": arguments.get("name"),
                "description": arguments.get("description"),
                "price": arguments.get("price"),
            },
        )