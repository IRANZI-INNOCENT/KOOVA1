"""
Kova Publish Content Tool.

Updates a Content record's status to published. The actual platform
integration (posting to Instagram, etc.) is delegated to the social
publishing layer when it becomes available.

This tool writes to the database.
"""

from __future__ import annotations

import logging
from typing import Any

from django.utils import timezone

from apps.content.models import Content
from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .base import Tool
from .types import ToolResult, ToolStatus

logger = logging.getLogger(__name__)


class PublishContentTool(Tool):
    """Publish an existing content asset."""

    @property
    def action(self) -> str:
        return DecisionAction.PUBLISH_CONTENT

    @property
    def description(self) -> str:
        return (
            "Publish an existing content asset. The content must be in "
            "draft or approved status. Use this only when the business "
            "has authorized publishing."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "content_id": {
                    "type": "integer",
                    "description": "The database ID of the content asset to publish.",
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
        """Mark a Content record as published."""

        arguments = arguments or {}
        content_id = arguments.get("content_id")
        business_id = context.business["id"]

        if content_id is None:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="A valid content_id is required.",
            )

        try:
            content_id = int(content_id)
        except (TypeError, ValueError):
            return ToolResult(
                status=ToolStatus.FAILED,
                message="content_id must be an integer.",
            )

        try:
            content = Content.objects.get(
                pk=content_id,
                business_id=business_id,
            )
        except Content.DoesNotExist:
            return ToolResult(
                status=ToolStatus.FAILED,
                message=f"Content {content_id} not found for this business.",
            )

        if content.status == Content.Status.PUBLISHED:
            return ToolResult(
                status=ToolStatus.SUCCESS,
                message="Content is already published.",
                data={"content_id": content.pk, "status": content.status},
            )

        if content.status == Content.Status.REJECTED:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="Rejected content cannot be published. Create new content instead.",
            )

        now = timezone.now()
        content.status = Content.Status.PUBLISHED
        content.published_at = now
        content.save(update_fields=["status", "published_at", "updated_at"])

        # Verify the update persisted
        content.refresh_from_db()
        if content.status != Content.Status.PUBLISHED:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="Failed to update content status in database.",
            )

        logger.info(
            "Content %s published for business %s",
            content.pk,
            business_id,
        )

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Content published successfully.",
            data={
                "content_id": content.pk,
                "business_id": business_id,
                "platform": content.platform,
                "status": content.status,
                "published_at": str(content.published_at),
            },
        )
