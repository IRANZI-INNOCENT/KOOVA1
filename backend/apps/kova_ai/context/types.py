from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class ContextTask(StrEnum):
    GENERAL = "general"
    CONTENT_CREATION = "content_creation"
    CUSTOMER_RESPONSE = "customer_response"
    COMMERCE = "commerce"


@dataclass(frozen=True)
class BusinessContext:
    """
    Immutable business context assembled for one Kova task.

    Products and the commerce page are part of the Business Brain because
    Commerce is not a separate intelligence system. Product information can
    influence content, customer responses, selling decisions, and future
    recommendations.
    """

    business: dict[str, Any]
    profile: dict[str, Any] | None
    audience: dict[str, Any] | None
    brand: dict[str, Any] | None
    goals: dict[str, Any] | None
    policy: dict[str, Any] | None
    task: ContextTask

    # Defaults keep older callers/tests compatible while allowing the
    # ContextEngine to populate these fields whenever relevant.
    products: list[dict[str, Any]] = field(default_factory=list)
    commerce_page: dict[str, Any] | None = None
    task_context: dict[str, Any] | None = None
    market: dict[str, Any] | None = None