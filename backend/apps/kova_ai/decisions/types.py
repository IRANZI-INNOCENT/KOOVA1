"""
Types used by the Kova Decision Engine.

The Decision object represents what Kova intends to do after evaluating
a task and its available business context.

A Decision does not execute anything.

Execution belongs to the future Tool / Action system.
"""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class DecisionAction(StrEnum):
    CREATE_CONTENT = "create_content"
    PUBLISH_CONTENT = "publish_content"

    RESPOND_TO_CUSTOMER = "respond_to_customer"

    CREATE_LEAD = "create_lead"

    MANAGE_PRODUCT = "manage_product"
    MANAGE_ORDER = "manage_order"
    MANAGE_COMMERCE = "manage_commerce"

    GET_ANALYTICS = "get_analytics"
    GET_SOCIAL_ACTIVITY = "get_social_activity"

    READ_BUSINESS_CONTEXT = "get_business_context"


class DecisionStatus(StrEnum):
    """Current state of a Kova decision."""

    READY = "ready"
    NEEDS_INFORMATION = "needs_information"
    NEEDS_APPROVAL = "needs_approval"


@dataclass(frozen=True)
class Decision:
    """
    Represents Kova's intended action.

    Decisions describe intent only. They do not perform external actions.
    """

    action: DecisionAction
    status: DecisionStatus
    reason: str
    inputs: dict[str, Any] = field(default_factory=dict)
    requires_approval: bool = False