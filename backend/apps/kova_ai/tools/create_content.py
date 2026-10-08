"""
Kova Create Content Tool.

Creates a structured content asset from a model-approved content request.

The tool is responsible for validating and normalizing content creation
inputs. It does not publish content to an external platform.

Publishing is a separate capability and must pass its own permission
and execution flow.
"""

from __future__ import annotations

from typing import Any

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import DecisionAction, Decision
from .base import Tool
from .types import ToolResult, ToolStatus


class CreateContentTool(Tool):
    """Create a content asset for a business."""

    @property
    def action(self) -> str:
        """Return the decision action supported by this tool."""

        return DecisionAction.CREATE_CONTENT

    @property
    def description(self) -> str:
        """Describe the content creation capability to the model."""

        return (
            "Create a social media content asset for the current business. "
            "Use this when the business owner wants content drafted or "
            "prepared. Creating content does not publish it."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        """Return the model-facing tool schema."""

        return {
            "type": "object",
            "properties": {
                "platform": {
                    "type": "string",
                    "description": (
                        "The intended social platform, such as Instagram, "
                        "Facebook, TikTok, or WhatsApp."
                    ),
                },
                "content_type": {
                    "type": "string",
                    "description": (
                        "The content format, such as post, reel, story, "
                        "carousel, or status."
                    ),
                },
                "caption": {
                    "type": "string",
                    "description": (
                        "The complete caption or text for the content."
                    ),
                },
                "call_to_action": {
                    "type": "string",
                    "description": (
                        "The desired customer call to action."
                    ),
                },
            },
            "required": [
                "platform",
                "content_type",
                "caption",
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
        """
        Create and return a structured content asset.

        The business identity comes from the authoritative execution
        context rather than model-supplied business identifiers.
        """

        arguments = arguments or {}

        platform = self._required_string(
            arguments,
            "platform",
        )
        content_type = self._required_string(
            arguments,
            "content_type",
        )
        caption = self._required_string(
            arguments,
            "caption",
        )

        if not platform:
            return self._failure(
                "A target platform is required.",
            )

        if not content_type:
            return self._failure(
                "A content type is required.",
            )

        if not caption:
            return self._failure(
                "Content cannot be created without a caption.",
            )

        call_to_action = arguments.get(
            "call_to_action",
            "",
        )

        if call_to_action is None:
            call_to_action = ""

        if not isinstance(call_to_action, str):
            return self._failure(
                "call_to_action must be a string.",
            )

        business = context.business

        content = {
            "business_id": business["id"],
            "business_name": business.get(
                "name",
                "",
            ),
            "platform": platform,
            "content_type": content_type,
            "caption": caption,
            "call_to_action": call_to_action.strip(),
            "status": "draft",
        }

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Content draft created successfully.",
            data={
                "content": content,
            },
        )

    @staticmethod
    def _required_string(
        arguments: dict[str, Any],
        field: str,
    ) -> str:
        """Return a trimmed string argument or an empty string."""

        value = arguments.get(
            field,
            "",
        )

        if not isinstance(value, str):
            return ""

        return value.strip()

    @staticmethod
    def _failure(message: str) -> ToolResult:
        """Create a standardized failed tool result."""

        return ToolResult(
            status=ToolStatus.FAILED,
            message=message,
        )