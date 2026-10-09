from dataclasses import dataclass
from enum import StrEnum

from .types import ContextTask


class ContextRequirement(StrEnum):
    BUSINESS = "business"
    PROFILE = "profile"
    AUDIENCE = "audience"
    BRAND = "brand"
    GOALS = "goals"
    POLICY = "policy"
    MARKET = "market"
    PRODUCTS = "products"
    COMMERCE_PAGE = "commerce_page"


@dataclass(frozen=True)
class TaskDefinition:
    """Defines the business information required for a Kova task."""

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
                ContextRequirement.MARKET,
                ContextRequirement.PRODUCTS,
                ContextRequirement.COMMERCE_PAGE,
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
                ContextRequirement.MARKET,
                ContextRequirement.PRODUCTS,
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
                ContextRequirement.MARKET,
                ContextRequirement.PRODUCTS,
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
                ContextRequirement.MARKET,
                ContextRequirement.PRODUCTS,
                ContextRequirement.COMMERCE_PAGE,
            }
        ),
    ),
}