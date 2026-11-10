"""
KCOVA Customer Response Tool.
"""

from __future__ import annotations

import logging
from typing import Any

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction
from apps.social.models import SocialMessage

from apps.social.services.inbox import send_reply

from .base import Tool
from .types import ToolResult, ToolStatus

logger = logging.getLogger(__name__)


def _resolve_inbound_message(
    *,
    business_id: int,
    conversation_id: str,
) -> SocialMessage | None:
    """
    conversation_id is the SocialMessage primary key for the inbound thread.
    """

    raw = conversation_id.strip()
    if raw.isdigit():
        return (
            SocialMessage.objects.filter(
                pk=int(raw),
                business_id=business_id,
                direction=SocialMessage.Direction.INBOUND,
            )
            .select_related("social_account")
            .first()
        )
    return (
        SocialMessage.objects.filter(
            business_id=business_id,
            direction=SocialMessage.Direction.INBOUND,
            external_id=raw,
        )
        .select_related("social_account")
        .first()
    )


class RespondToCustomerTool(Tool):
    """Send a customer response on a connected channel when policy allows."""

    @property
    def action(self) -> str:
        return DecisionAction.RESPOND_TO_CUSTOMER

    @property
    def description(self) -> str:
        return (
            "Respond to a customer message or social conversation. "
            "conversation_id is the inbox message id (or platform message id). "
            "The channel must match the business policy (comment or dm)."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "conversation_id": {
                    "type": "string",
                    "description": (
                        "The customer conversation identifier (inbox message id)."
                    ),
                },
                "message": {
                    "type": "string",
                    "description": "The response to send to the customer.",
                },
                "channel": {
                    "type": "string",
                    "description": (
                        "Customer communication channel: comment, dm, "
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

        business_id = context.business["id"]
        inbound = _resolve_inbound_message(
            business_id=business_id,
            conversation_id=conversation_id,
        )
        if inbound is None:
            return self._failure(
                "No inbound conversation was found for that conversation_id."
            )

        normalized = channel.strip().lower()
        if normalized in {"instagram", "facebook", "comment", "comments"}:
            policy_channel = "comment"
        elif normalized in {"dm", "message", "messages"}:
            policy_channel = "dm"
        else:
            policy_channel = normalized

        try:
            outbound = send_reply(inbound, message.strip())
        except Exception as exc:
            logger.exception("Customer reply failed for message %s", inbound.pk)
            return self._failure(f"Could not send the reply: {exc}")

        sent = outbound.delivery_status == outbound.Delivery.SENT
        saved = outbound.delivery_status == outbound.Delivery.SAVED
        status_label = "sent" if sent else ("saved" if saved else str(outbound.delivery_status))

        return ToolResult(
            status=ToolStatus.SUCCESS if sent or saved else ToolStatus.FAILED,
            message=(
                "Customer reply sent."
                if sent
                else (
                    "Reply saved for manual send."
                    if saved
                    else outbound.reply_error or "The platform did not accept the reply."
                )
            ),
            data={
                "business_id": business_id,
                "conversation_id": conversation_id.strip(),
                "inbound_message_id": inbound.pk,
                "outbound_message_id": outbound.pk,
                "channel": policy_channel,
                "delivery_status": status_label,
                "status": status_label,
            },
        )

    @staticmethod
    def _failure(message: str) -> ToolResult:
        return ToolResult(
            status=ToolStatus.FAILED,
            message=message,
        )
