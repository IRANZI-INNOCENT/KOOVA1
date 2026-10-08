"""
Kova Social Activity Tool.
"""

from __future__ import annotations

from typing import Any

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .base import Tool
from .types import ToolResult, ToolStatus


class GetSocialActivityTool(Tool):
    """Retrieve social activity relevant to Kova."""

    @property
    def action(self) -> str:
        return DecisionAction.GET_SOCIAL_ACTIVITY

    @property
    def description(self) -> str:
        return (
            "Retrieve recent social media activity such as posts, comments, "
            "messages, engagement, or leads."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "activity_type": {
                    "type": "string",
                    "enum": [
                        "posts",
                        "comments",
                        "messages",
                        "engagement",
                        "leads",
                    ],
                },
                "platform": {
                    "type": "string",
                },
            },
            "required": ["activity_type"],
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

        activity_type = arguments.get("activity_type")

        if activity_type not in {
            "posts",
            "comments",
            "messages",
            "engagement",
            "leads",
        }:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="Unsupported social activity type.",
            )

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Social activity request accepted.",
            data={
                "business_id": context.business["id"],
                "activity_type": activity_type,
                "platform": arguments.get("platform"),
            },
        )