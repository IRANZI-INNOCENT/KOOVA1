"""
Kova Create Lead Tool.

Creates a real Lead record in the database when the AI detects buying
interest or meaningful engagement.

This tool writes to the database.
"""

from __future__ import annotations

import logging
from typing import Any

from apps.leads.models import Lead
from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .base import Tool
from .types import ToolResult, ToolStatus

logger = logging.getLogger(__name__)


class CreateLeadTool(Tool):
    """Create a qualified business lead."""

    @property
    def action(self) -> str:
        return DecisionAction.CREATE_LEAD

    @property
    def description(self) -> str:
        return (
            "Create a lead when a customer demonstrates meaningful buying "
            "interest or otherwise qualifies as a business lead."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "customer_name": {
                    "type": "string",
                    "description": "Name of the potential customer.",
                },
                "customer_id": {
                    "type": "string",
                    "description": "External customer identifier from social platform.",
                },
                "conversation_id": {
                    "type": "string",
                    "description": "Reference to the conversation where interest was detected.",
                },
                "source": {
                    "type": "string",
                    "description": (
                        "Where the lead came from: instagram, facebook, "
                        "whatsapp, tiktok, web, manual, or other."
                    ),
                },
                "interest": {
                    "type": "string",
                    "description": "What the customer expressed interest in.",
                },
                "notes": {
                    "type": "string",
                    "description": "Additional context about the lead.",
                },
            },
            "required": [
                "source",
                "interest",
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
        """Create a Lead record in the database."""

        arguments = arguments or {}

        source = arguments.get("source")
        interest = arguments.get("interest")

        if not isinstance(source, str) or not source.strip():
            return self._failure("A lead source is required.")

        if not isinstance(interest, str) or not interest.strip():
            return self._failure("Customer interest is required.")

        business_id = context.business["id"]

        try:
            lead = Lead.objects.create(
                business_id=business_id,
                customer_name=arguments.get("customer_name", "").strip() if isinstance(arguments.get("customer_name"), str) else "",
                customer_id=arguments.get("customer_id", "").strip() if isinstance(arguments.get("customer_id"), str) else "",
                conversation_id=arguments.get("conversation_id", "").strip() if isinstance(arguments.get("conversation_id"), str) else "",
                source=source.strip().lower(),
                interest=interest.strip(),
                notes=arguments.get("notes", "").strip() if isinstance(arguments.get("notes"), str) else "",
                status=Lead.Status.NEW,
                created_by_ai=True,
            )
            from apps.leads.services.followups import schedule_initial_follow_up

            schedule_initial_follow_up(lead)
        except Exception as exc:
            logger.error(
                "Failed to create lead for business %s: %s",
                business_id,
                exc,
            )
            return self._failure(f"Failed to save lead: {exc}")

        # Verify persistence
        if not Lead.objects.filter(pk=lead.pk).exists():
            return self._failure("Lead was not persisted to the database.")

        try:
            from apps.businesses.models import Business
            from apps.notifications.services.events import send_new_lead

            business = Business.objects.filter(pk=business_id).select_related("owner").first()
            if business is not None:
                send_new_lead(business, lead)
        except Exception:
            pass

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Lead created and saved to database.",
            data={
                "lead_id": lead.pk,
                "business_id": business_id,
                "customer_name": lead.customer_name,
                "source": lead.source,
                "interest": lead.interest,
                "status": lead.status,
            },
        )

    @staticmethod
    def _failure(message: str) -> ToolResult:
        return ToolResult(
            status=ToolStatus.FAILED,
            message=message,
        )
