"""
KCOVA Publish Content Tool.

Queues content through the social publishing layer so Meta (or fallback
channels) receive the post. The database reflects publication only after
the publisher succeeds, except for channels KCOVA saves as ready messages.
"""

from __future__ import annotations

import logging
from typing import Any

from apps.content.models import Content
from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction
from apps.social.models import SocialPost
from apps.social.services.publish import PublishError, enqueue

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
        """Queue or send content through the social publishing service."""

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

        if content.status == Content.Status.REJECTED:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="Rejected content cannot be published. Create new content instead.",
            )

        if content.status == Content.Status.PUBLISHED:
            return ToolResult(
                status=ToolStatus.SUCCESS,
                message="Content is already published.",
                data={"content_id": content.pk, "status": content.status},
            )

        try:
            post = enqueue(content)
        except PublishError as exc:
            return ToolResult(
                status=ToolStatus.FAILED,
                message=str(exc),
            )

        content.refresh_from_db()
        payload: dict[str, Any] = {
            "content_id": content.pk,
            "business_id": business_id,
            "platform": content.platform,
            "status": content.status,
        }

        if post is not None:
            payload["social_post_id"] = post.pk
            payload["publishing_status"] = post.publishing_status
            if post.publishing_status == SocialPost.PublishingStatus.PUBLISHED:
                payload["published_at"] = str(content.published_at or post.published_at or "")
                message = "Content published successfully."
            elif post.publishing_status == SocialPost.PublishingStatus.SCHEDULED:
                message = "Content scheduled for publishing."
                payload["scheduled_at"] = (
                    post.scheduled_at.isoformat() if post.scheduled_at else ""
                )
            elif post.publishing_status == SocialPost.PublishingStatus.FAILED:
                return ToolResult(
                    status=ToolStatus.FAILED,
                    message=post.publishing_error or "Publishing failed.",
                    data=payload,
                )
            else:
                message = "Content queued for publishing."
        else:
            message = "Content is ready to send on a channel without API publishing."

        if content.status == Content.Status.PUBLISHED:
            payload["published_at"] = str(content.published_at or "")

        logger.info(
            "Content %s publish requested for business %s (status=%s)",
            content.pk,
            business_id,
            content.status,
        )

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message=message,
            data=payload,
        )
