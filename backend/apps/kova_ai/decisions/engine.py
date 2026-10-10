"""
Kova Decision Engine.

The Decision Engine determines what Kova should do for a supported task.

V1 is intentionally deterministic. It does not call an AI model.

The future AI reasoning layer can eventually replace or enrich the
decision logic without changing the Decision contract.
"""

from apps.kova_ai.context.types import BusinessContext, ContextTask

from .types import (
    Decision,
    DecisionAction,
    DecisionStatus,
)


class DecisionEngine:
    """
    Determines Kova's intended action from business context.

    The engine does not execute actions and does not communicate with
    external services.
    """

    def decide(
        self,
        *,
        context: BusinessContext,
    ) -> Decision:
        """
        Produce a decision for the supplied business context.

        Args:
            context: Business context assembled by the Context Engine.

        Returns:
            A structured Decision.

        Raises:
            ValueError: If the task is not supported by the Decision Engine.
        """

        if context.policy and context.policy.get("social_operating_mode") == "autopilot":
            return self._decide_autopilot(context)

        if context.task == ContextTask.CONTENT_CREATION:
            return self._decide_content_creation(context)

        if context.task == ContextTask.CUSTOMER_RESPONSE:
            return self._decide_customer_response(context)

        if context.task == ContextTask.COMMERCE:
            return self._decide_commerce(context)

        raise ValueError(
            f"Decision making is not supported for task: {context.task}"
        )

    @staticmethod
    def _decide_autopilot(context: BusinessContext) -> Decision:
        action = {
            ContextTask.CONTENT_CREATION: DecisionAction.CREATE_CONTENT,
            ContextTask.CUSTOMER_RESPONSE: DecisionAction.RESPOND_TO_CUSTOMER,
            ContextTask.COMMERCE: DecisionAction.MANAGE_COMMERCE,
        }.get(context.task, DecisionAction.READ_BUSINESS_CONTEXT)
        return Decision(
            action=action,
            status=DecisionStatus.READY,
            reason="Autopilot is on. Kova runs this part of the business.",
            inputs=context.task_context or {},
        )

    @staticmethod
    def _decide_content_creation(
        context: BusinessContext,
    ) -> Decision:
        """Determine whether Kova can proceed with content creation."""

        if not context.policy:
            return Decision(
                action=DecisionAction.CREATE_CONTENT,
                status=DecisionStatus.NEEDS_INFORMATION,
                reason="Business policy is required before creating content.",
            )

        if not context.policy.get("allow_content_creation", False):
            return Decision(
                action=DecisionAction.CREATE_CONTENT,
                status=DecisionStatus.NEEDS_APPROVAL,
                reason="Business policy does not currently allow content creation.",
                requires_approval=True,
            )

        return Decision(
            action=DecisionAction.CREATE_CONTENT,
            status=DecisionStatus.READY,
            reason="Content creation is allowed by the business policy.",
            inputs=context.task_context or {},
        )

    @staticmethod
    def _decide_customer_response(
        context: BusinessContext,
    ) -> Decision:
        """Determine whether Kova can respond to a customer."""

        if not context.policy:
            return Decision(
                action=DecisionAction.RESPOND_TO_CUSTOMER,
                status=DecisionStatus.NEEDS_INFORMATION,
                reason="Business policy is required before responding to customers.",
            )

        if not context.policy.get("allow_comment_replies", False) and not context.policy.get(
            "allow_dm_replies",
            False,
        ):
            return Decision(
                action=DecisionAction.RESPOND_TO_CUSTOMER,
                status=DecisionStatus.NEEDS_APPROVAL,
                reason="Business policy does not currently allow customer responses.",
                requires_approval=True,
            )

        return Decision(
            action=DecisionAction.RESPOND_TO_CUSTOMER,
            status=DecisionStatus.READY,
            reason="Customer responses are allowed by the business policy.",
            inputs=context.task_context or {},
        )

    @staticmethod
    def _decide_commerce(
        context: BusinessContext,
    ) -> Decision:
        """Determine whether Kova can proceed with a commerce operation."""

        if not context.policy:
            return Decision(
                action=DecisionAction.MANAGE_COMMERCE,
                status=DecisionStatus.NEEDS_INFORMATION,
                reason="Business policy is required before managing commerce.",
            )

        if not context.policy.get("allow_product_management", False) and not context.policy.get(
            "allow_order_management",
            False,
        ):
            return Decision(
                action=DecisionAction.MANAGE_COMMERCE,
                status=DecisionStatus.NEEDS_APPROVAL,
                reason="Business policy does not currently allow commerce management.",
                requires_approval=True,
            )

        return Decision(
            action=DecisionAction.MANAGE_COMMERCE,
            status=DecisionStatus.READY,
            reason="Commerce management is allowed by the business policy.",
            inputs=context.task_context or {},
        )