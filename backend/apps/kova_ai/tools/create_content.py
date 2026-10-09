"""
Kova Create Content Tool.

Creates a real Content record in the database. The content starts as a
draft that the business owner can review, approve, and publish.

This tool writes to the database. It does not return fake "accepted"
responses.
"""

from __future__ import annotations

import logging
from typing import Any

from apps.content.models import Content
from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import DecisionAction, Decision

from .base import Tool
from .types import ToolResult, ToolStatus

logger = logging.getLogger(__name__)


class CreateContentTool(Tool):
    """Create a content asset for a business."""

    @property
    def action(self) -> str:
        return DecisionAction.CREATE_CONTENT

    @property
    def description(self) -> str:
        return (
            "Create a social media content asset for the current business. "
            "Use this when the business owner wants content drafted or "
            "prepared. Creating content does not publish it."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "platform": {
                    "type": "string",
                    "description": (
                        "The intended social platform: instagram, "
                        "facebook, tiktok, whatsapp, x, or other."
                    ),
                },
                "content_type": {
                    "type": "string",
                    "description": (
                        "The content format: post, reel, story, "
                        "carousel, status, or other."
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
        """Create a Content record in the database."""

        arguments = arguments or {}

        platform = self._required_string(arguments, "platform")
        content_type = self._required_string(arguments, "content_type")
        caption = self._required_string(arguments, "caption")

        if not platform:
            return self._failure("A target platform is required.")

        if not content_type:
            return self._failure("A content type is required.")

        if not caption:
            return self._failure("Content cannot be created without a caption.")

        call_to_action = arguments.get("call_to_action", "")
        if not isinstance(call_to_action, str):
            return self._failure("call_to_action must be a string.")

        business_id = context.business["id"]

        try:
            content = Content.objects.create(
                business_id=business_id,
                platform=platform.lower(),
                content_type=content_type.lower(),
                caption=caption,
                call_to_action=call_to_action.strip(),
                status=Content.Status.DRAFT,
                created_by_ai=True,
            )
        except Exception as exc:
            logger.error(
                "Failed to create content for business %s: %s",
                business_id,
                exc,
            )
            return self._failure(f"Failed to save content: {exc}")

        # Verify the record was persisted
        if not Content.objects.filter(pk=content.pk).exists():
            return self._failure("Content was not persisted to the database.")

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Content draft created and saved to database.",
            data={
                "content_id": content.pk,
                "business_id": business_id,
                "platform": content.platform,
                "content_type": content.content_type,
                "caption": content.caption,
                "call_to_action": content.call_to_action,
                "status": content.status,
            },
        )

    @staticmethod
    def _required_string(arguments: dict[str, Any], field: str) -> str:
        value = arguments.get(field, "")
        if not isinstance(value, str):
            return ""
        return value.strip()

    @staticmethod
    def _failure(message: str) -> ToolResult:
        return ToolResult(
            status=ToolStatus.FAILED,
            message=message,
        )
