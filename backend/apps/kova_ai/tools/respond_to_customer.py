"""
Kova Customer Response Tool.
"""

from __future__ import annotations

from typing import Any

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .base import Tool
from .types import ToolResult, ToolStatus


class RespondToCustomerTool(Tool):
    """Prepare or send a customer response."""

    @property
    def action(self) -> str:
        return DecisionAction.RESPOND_TO_CUSTOMER

    @property
    def description(self) -> str:
        return (
            "Respond to a customer message or social conversation using "
            "the business context and customer information available to Kova."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "conversation_id": {
                    "type": "string",
                    "description": "The customer conversation identifier.",
                },
                "message": {
                    "type": "string",
                    "description": "The response to send to the customer.",
                },
                "channel": {
                    "type": "string",
                    "description": (
                        "Customer communication channel such as "
                        "instagram, facebook, whatsapp, or web."
                    ),
                },
            },
            "required": [
                "conversation_id",
                "message",
                "channel",
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

        conversation_id = arguments.get("conversation_id")
        message = arguments.get("message")
        channel = arguments.get("channel")

        if not isinstance(conversation_id, str) or not conversation_id.strip():
            return self._failure("A conversation_id is required.")

        if not isinstance(message, str) or not message.strip():
            return self._failure("A customer response message is required.")

        if not isinstance(channel, str) or not channel.strip():
            return self._failure("A customer communication channel is required.")

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Customer response prepared successfully.",
            data={
                "business_id": context.business["id"],
                "conversation_id": conversation_id.strip(),
                "channel": channel.strip().lower(),
                "message": message.strip(),
                "status": "response_prepared",
            },
        )

    @staticmethod
    def _failure(message: str) -> ToolResult:
        return ToolResult(
            status=ToolStatus.FAILED,
            message=message,
        )