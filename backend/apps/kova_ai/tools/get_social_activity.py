"""
KCOVA Social Activity Tool.

Reads recent posts, messages, engagement, and leads from the database.
"""

from __future__ import annotations

from typing import Any

from django.db.models import Sum

from apps.content.models import Content
from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction
from apps.leads.models import Lead
from apps.social.models import SocialMessage, SocialPost

from .base import Tool
from .types import ToolResult, ToolStatus

_ACTIVITY_TYPES = frozenset(
    {"posts", "comments", "messages", "engagement", "leads"},
)


class GetSocialActivityTool(Tool):
    """Retrieve social activity relevant to KCOVA."""

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
                "limit": {
                    "type": "integer",
                    "description": "Max rows to return (default 20, max 50).",
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
        if activity_type not in _ACTIVITY_TYPES:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="Unsupported social activity type.",
            )

        business_id = context.business["id"]
        platform = self._normalize_platform(arguments.get("platform"))
        limit = self._clamp_limit(arguments.get("limit"))

        if activity_type == "posts":
            return self._posts(business_id, platform, limit)
        if activity_type == "comments":
            return self._messages(
                business_id,
                platform,
                limit,
                kind=SocialMessage.Kind.COMMENT,
            )
        if activity_type == "messages":
            return self._messages(
                business_id,
                platform,
                limit,
                kind=SocialMessage.Kind.MESSAGE,
            )
        if activity_type == "engagement":
            return self._engagement(business_id, platform)
        return self._leads(business_id, limit)

    @staticmethod
    def _clamp_limit(value: Any) -> int:
        try:
            n = int(value)
        except (TypeError, ValueError):
            n = 20
        return max(1, min(n, 50))

    @staticmethod
    def _normalize_platform(value: Any) -> str | None:
        if not isinstance(value, str) or not value.strip():
            return None
        return value.strip().lower()

    def _posts(
        self,
        business_id: int,
        platform: str | None,
        limit: int,
    ) -> ToolResult:
        qs = Content.objects.filter(business_id=business_id).order_by(
            "-updated_at"
        )
        if platform:
            qs = qs.filter(platform=platform)

        items = [
            {
                "id": row.pk,
                "platform": row.platform,
                "content_type": row.content_type,
                "status": row.status,
                "caption_preview": (row.caption or "")[:160],
                "updated_at": row.updated_at.isoformat(),
            }
            for row in qs[:limit]
        ]

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message=f"Retrieved {len(items)} content records.",
            data={"activity_type": "posts", "items": items},
        )

    def _messages(
        self,
        business_id: int,
        platform: str | None,
        limit: int,
        *,
        kind: str,
    ) -> ToolResult:
        qs = (
            SocialMessage.objects.filter(business_id=business_id, kind=kind)
            .order_by("-created_at")
        )
        if platform:
            qs = qs.filter(channel=platform)

        items = [
            {
                "id": row.pk,
                "channel": row.channel,
                "direction": row.direction,
                "customer_name": row.customer_name,
                "body_preview": (row.body or "")[:200],
                "intent": row.intent or None,
                "created_at": row.created_at.isoformat(),
            }
            for row in qs[:limit]
        ]

        label = "comments" if kind == SocialMessage.Kind.COMMENT else "messages"
        return ToolResult(
            status=ToolStatus.SUCCESS,
            message=f"Retrieved {len(items)} {label}.",
            data={"activity_type": label, "items": items},
        )

    def _engagement(self, business_id: int, platform: str | None) -> ToolResult:
        qs = SocialPost.objects.filter(content__business_id=business_id)
        if platform:
            qs = qs.filter(social_account__platform=platform)

        totals = qs.aggregate(
            reach=Sum("reach"),
            impressions=Sum("impressions"),
            likes=Sum("likes"),
            comments=Sum("comments_count"),
            shares=Sum("shares"),
            clicks=Sum("clicks"),
        )
        published = qs.filter(
            publishing_status=SocialPost.PublishingStatus.PUBLISHED
        ).count()

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Engagement totals from published social posts.",
            data={
                "activity_type": "engagement",
                "published_posts": published,
                "totals": {k: int(v or 0) for k, v in totals.items()},
            },
        )

    def _leads(self, business_id: int, limit: int) -> ToolResult:
        qs = Lead.objects.filter(business_id=business_id).order_by("-created_at")

        items = [
            {
                "id": row.pk,
                "status": row.status,
                "source": row.source,
                "customer_name": row.customer_name,
                "interest_preview": (row.interest or "")[:160],
                "created_at": row.created_at.isoformat(),
            }
            for row in qs[:limit]
        ]

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message=f"Retrieved {len(items)} leads.",
            data={"activity_type": "leads", "items": items},
        )
