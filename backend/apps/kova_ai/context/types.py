"""
Types used by the Kova Context Engine.

The Context Engine assembles existing business data into an in-memory
context package that can later be consumed by Kova's Decision Engine.

No context is persisted here. The existing Django models remain the
source of truth.
"""

from dataclasses import dataclass
from enum import StrEnum
from typing import Any


class ContextTask(StrEnum):
    """Tasks that determine which business context Kova needs."""

    GENERAL = "general"
    CONTENT_CREATION = "content_creation"
    CUSTOMER_RESPONSE = "customer_response"
    COMMERCE = "commerce"


@dataclass(frozen=True)
class BusinessContext:
    """
    Immutable business context assembled for a specific Kova task.

    The core Business Brain entities are always represented. Task-specific
    data can be added later without changing the underlying database models.
    """

    business: dict[str, Any]
    profile: dict[str, Any] | None
    audience: dict[str, Any] | None
    brand: dict[str, Any] | None
    goals: dict[str, Any] | None
    policy: dict[str, Any] | None

    task: ContextTask

    task_context: dict[str, Any] | None = None