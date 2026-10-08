"""
Kova Publish Content Tool.

Publishes an existing content asset to a connected social platform.

The tool never decides whether publishing is allowed. That responsibility
belongs to the permission engine.

The actual platform integration is delegated to the social publishing layer.
"""

from __future__ import annotations

from typing import Any

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .base import Tool
from .types import ToolResult, ToolStatus


class PublishContentTool(Tool):
    """Publish an existing content asset."""

    @property
    def action(self) -> str:
        return DecisionAction.PUBLISH_CONTENT

    @property
    def description(self) -> str:
        return (
            "Publish an existing content asset to its configured social "
            "media platform. Use this only when the business has authorized "
            "publishing."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "string",
                    "description": "The identifier of the content asset to publish.",
                },
            },
            "required": ["content_id"],
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

        content_id = arguments.get("content_id")

        if not isinstance(content_id, str) or not content_id.strip():
            return ToolResult(
                status=ToolStatus.FAILED,
                message="A valid content_id is required.",
            )

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Content publishing request accepted.",
            data={
                "content_id": content_id.strip(),
                "business_id": context.business["id"],
                "status": "publish_requested",
            },
        )