"""
Kova Analytics Tool.
"""

from __future__ import annotations

from typing import Any

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .base import Tool
from .types import ToolResult, ToolStatus


class GetAnalyticsTool(Tool):
    """Retrieve business analytics."""

    @property
    def action(self) -> str:
        return DecisionAction.GET_ANALYTICS

    @property
    def description(self) -> str:
        return (
            "Retrieve business performance analytics to help Kova "
            "understand what is working and what needs attention."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "metric": {
                    "type": "string",
                    "enum": [
                        "sales",
                        "leads",
                        "content",
                        "engagement",
                        "customers",
                    ],
                },
                "period": {
                    "type": "string",
                    "description": "Requested reporting period.",
                },
            },
            "required": ["metric"],
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

        metric = arguments.get("metric")

        if metric not in {
            "sales",
            "leads",
            "content",
            "engagement",
            "customers",
        }:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="Unsupported analytics metric.",
            )

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Analytics request accepted.",
            data={
                "business_id": context.business["id"],
                "metric": metric,
                "period": arguments.get("period"),
            },
        )