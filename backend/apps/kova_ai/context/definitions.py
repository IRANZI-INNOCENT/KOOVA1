"""
Task definitions for the Kova Context Engine.

A task definition describes which core Business Brain context Kova
needs for a particular operation.

Task definitions do not retrieve data and do not make decisions.
They only describe context requirements.

The Context Engine uses these definitions when assembling
BusinessContext objects.
"""

from dataclasses import dataclass
from enum import StrEnum

from .types import ContextTask


class ContextRequirement(StrEnum):
    """Core business context available to Kova."""

    BUSINESS = "business"
    PROFILE = "profile"
    AUDIENCE = "audience"
    BRAND = "brand"
    GOALS = "goals"
    POLICY = "policy"


@dataclass(frozen=True)
class TaskDefinition:
    """
    Describes the context required for a Kova task.

    Requirements represent the minimum core business context
    needed before the task can be passed to the Decision Engine.
    """

    task: ContextTask
    requirements: frozenset[ContextRequirement]


TASK_DEFINITIONS: dict[ContextTask, TaskDefinition] = {
    ContextTask.GENERAL: TaskDefinition(
        task=ContextTask.GENERAL,
        requirements=frozenset(
            {
                ContextRequirement.BUSINESS,
                ContextRequirement.PROFILE,
                ContextRequirement.AUDIENCE,
                ContextRequirement.BRAND,
                ContextRequirement.GOALS,
                ContextRequirement.POLICY,
            }
        ),
    ),
    ContextTask.CONTENT_CREATION: TaskDefinition(
        task=ContextTask.CONTENT_CREATION,
        requirements=frozenset(
            {
                ContextRequirement.BUSINESS,
                ContextRequirement.BRAND,
                ContextRequirement.AUDIENCE,
                ContextRequirement.GOALS,
                ContextRequirement.POLICY,
            }
        ),
    ),
    ContextTask.CUSTOMER_RESPONSE: TaskDefinition(
        task=ContextTask.CUSTOMER_RESPONSE,
        requirements=frozenset(
            {
                ContextRequirement.BUSINESS,
                ContextRequirement.BRAND,
                ContextRequirement.POLICY,
            }
        ),
    ),
    ContextTask.COMMERCE: TaskDefinition(
        task=ContextTask.COMMERCE,
        requirements=frozenset(
            {
                ContextRequirement.BUSINESS,
                ContextRequirement.GOALS,
                ContextRequirement.POLICY,
            }
        ),
    ),
}