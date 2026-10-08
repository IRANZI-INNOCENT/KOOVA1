"""
Kova Context Engine.

The Context Engine determines what Kova needs to know about a business
for a particular task.

It does not make decisions and it does not call an AI model.

Its responsibility is:

    Database
        ↓
    Task Definition
        ↓
    Relevant business context
        ↓
    BusinessContext

The Decision Engine will consume this context later.
"""

from typing import Any

from django.db.models import Model

from apps.business_brain.models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessPolicy,
    BusinessProfile,
)
from apps.businesses.models import Business

from .definitions import (
    ContextRequirement,
    TASK_DEFINITIONS,
    TaskDefinition,
)
from .types import BusinessContext, ContextTask


class ContextEngine:
    """
    Builds task-specific context for Kova.

    The engine does not persist context. It reads the existing business
    entities and assembles them into an in-memory BusinessContext object.

    Only the context required by the task definition is loaded.
    """

    def build(
        self,
        *,
        business_id: int,
        task: ContextTask = ContextTask.GENERAL,
        task_context: dict[str, Any] | None = None,
    ) -> BusinessContext:
        """
        Build context for a business and a specific Kova task.

        Args:
            business_id: ID of the business whose context is required.
            task: The operation Kova is preparing to perform.
            task_context: Optional task-specific information.

        Returns:
            A BusinessContext containing the context required by the task.

        Raises:
            Business.DoesNotExist: If the business does not exist.
        """

        business = self._get_business(business_id)
        definition = self._get_task_definition(task)

        return BusinessContext(
            business=self._serialize_business(business),
            profile=self._get_profile(
                business,
                definition,
            ),
            audience=self._get_audience(
                business,
                definition,
            ),
            brand=self._get_brand(
                business,
                definition,
            ),
            goals=self._get_goals(
                business,
                definition,
            ),
            policy=self._get_policy(
                business,
                definition,
            ),
            task=task,
            task_context=task_context,
        )

    @staticmethod
    def _get_business(
        business_id: int,
    ) -> Business:
        """
        Load the business that owns the requested context.

        Authorization is intentionally handled outside this low-level
        engine for V1. The engine receives a business ID and assembles
        context for that business.
        """

        return Business.objects.get(id=business_id)

    @staticmethod
    def _get_task_definition(
        task: ContextTask,
    ) -> TaskDefinition:
        """Return the definition describing the task's context needs."""

        return TASK_DEFINITIONS[task]

    @staticmethod
    def _requires(
        definition: TaskDefinition,
        requirement: ContextRequirement,
    ) -> bool:
        """Return whether the task requires a particular context type."""

        return requirement in definition.requirements

    @classmethod
    def _get_profile(
        cls,
        business: Business,
        definition: TaskDefinition,
    ) -> dict[str, Any] | None:
        """Load Business Profile when required by the task."""

        if not cls._requires(
            definition,
            ContextRequirement.PROFILE,
        ):
            return None

        return cls._serialize_optional(
            BusinessProfile.objects.filter(
                business=business,
            ).first()
        )

    @classmethod
    def _get_audience(
        cls,
        business: Business,
        definition: TaskDefinition,
    ) -> dict[str, Any] | None:
        """Load Business Audience when required by the task."""

        if not cls._requires(
            definition,
            ContextRequirement.AUDIENCE,
        ):
            return None

        return cls._serialize_optional(
            BusinessAudience.objects.filter(
                business=business,
            ).first()
        )

    @classmethod
    def _get_brand(
        cls,
        business: Business,
        definition: TaskDefinition,
    ) -> dict[str, Any] | None:
        """Load Business Brand when required by the task."""

        if not cls._requires(
            definition,
            ContextRequirement.BRAND,
        ):
            return None

        return cls._serialize_optional(
            BusinessBrand.objects.filter(
                business=business,
            ).first()
        )

    @classmethod
    def _get_goals(
        cls,
        business: Business,
        definition: TaskDefinition,
    ) -> dict[str, Any] | None:
        """Load Business Goals when required by the task."""

        if not cls._requires(
            definition,
            ContextRequirement.GOALS,
        ):
            return None

        return cls._serialize_optional(
            BusinessGoal.objects.filter(
                business=business,
            ).first()
        )

    @classmethod
    def _get_policy(
        cls,
        business: Business,
        definition: TaskDefinition,
    ) -> dict[str, Any] | None:
        """Load Business Policy when required by the task."""

        if not cls._requires(
            definition,
            ContextRequirement.POLICY,
        ):
            return None

        return cls._serialize_optional(
            BusinessPolicy.objects.filter(
                business=business,
            ).first()
        )

    @staticmethod
    def _serialize_business(
        business: Business,
    ) -> dict[str, Any]:
        """Return the business fields Kova needs as base context."""

        return {
            "id": business.id,
            "name": business.name,
            "description": business.description,
            "industry": business.industry,
            "location": business.location,
            "email": business.email,
            "phone": business.phone,
        }

    @staticmethod
    def _serialize_optional(
        instance: Model | None,
    ) -> dict[str, Any] | None:
        """
        Convert an optional Business Brain model into a context dictionary.

        Database identifiers and timestamps are intentionally excluded.
        They are persistence details rather than business intelligence
        needed for reasoning.
        """

        if instance is None:
            return None

        excluded_fields = {
            "id",
            "business",
            "created_at",
            "updated_at",
        }

        return {
            field.name: getattr(instance, field.name)
            for field in instance._meta.fields
            if field.name not in excluded_fields
        }