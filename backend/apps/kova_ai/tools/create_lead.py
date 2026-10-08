"""
Kova Create Lead Tool.
"""

from __future__ import annotations

from typing import Any

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .base import Tool
from .types import ToolResult, ToolStatus


class CreateLeadTool(Tool):
    """Create a qualified business lead."""

    @property
    def action(self) -> str:
        return DecisionAction.CREATE_LEAD

    @property
    def description(self) -> str:
        return (
            "Create a lead when a customer demonstrates meaningful buying "
            "interest or otherwise qualifies as a business lead."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "customer_id": {
                    "type": "string",
                },
                "conversation_id": {
                    "type": "string",
                },
                "source": {
                    "type": "string",
                },
                "interest": {
                    "type": "string",
                },
                "notes": {
                    "type": "string",
                },
            },
            "required": [
                "source",
                "interest",
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

        source = arguments.get("source")
        interest = arguments.get("interest")

        if not isinstance(source, str) or not source.strip():
            return self._failure("A lead source is required.")

        if not isinstance(interest, str) or not interest.strip():
            return self._failure("Customer interest is required.")

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Lead creation request accepted.",
            data={
                "business_id": context.business["id"],
                "customer_id": arguments.get("customer_id"),
                "conversation_id": arguments.get("conversation_id"),
                "source": source.strip(),
                "interest": interest.strip(),
                "notes": arguments.get("notes", ""),
                "status": "lead_created",
            },
        )

    @staticmethod
    def _failure(message: str) -> ToolResult:
        return ToolResult(
            status=ToolStatus.FAILED,
            message=message,
        )