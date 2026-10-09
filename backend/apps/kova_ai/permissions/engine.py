"""
Permission engine for Kova.

The permission engine is the application's hard authorization boundary
for AI-requested actions.

The LLM may reason about what should happen, but it cannot grant itself
permission to perform an action. This engine evaluates the requested
decision against the business policy and other application constraints.
"""

from __future__ import annotations

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .types import PermissionResult, PermissionStatus


class PermissionEngine:
    """
    Determine whether Kova is allowed to perform a decision.

    The LLM may propose an action, but the application remains responsible
    for enforcing business permissions and approval requirements.
    """

    def check(
        self,
        *,
        decision: Decision,
        context: BusinessContext,
    ) -> PermissionResult:
        """
        Evaluate a decision against the current business context.

        Returns:
            PermissionResult describing whether the action is allowed,
            requires approval, or is denied.
        """

        policy = context.policy

        if policy is None:
            return PermissionResult(
                status=PermissionStatus.REQUIRES_APPROVAL,
                reason=(
                    "No business policy is available. "
                    "Owner approval is required before Kova can act."
                ),
            )

        if decision.requires_approval:
            return PermissionResult(
                status=PermissionStatus.REQUIRES_APPROVAL,
                reason="The requested action requires owner approval.",
            )

        # ------------------------------------------------------------------
        # Read-only context retrieval — always allowed.
        # ------------------------------------------------------------------

        if decision.action == DecisionAction.READ_BUSINESS_CONTEXT:
            return PermissionResult(
                status=PermissionStatus.ALLOWED,
                reason=(
                    "Kova may read the business context for the "
                    "current business."
                ),
            )

        # ------------------------------------------------------------------
        # Analytics and social activity — read-only, always allowed.
        # ------------------------------------------------------------------

        if decision.action == DecisionAction.GET_ANALYTICS:
            return PermissionResult(
                status=PermissionStatus.ALLOWED,
                reason="Kova may retrieve analytics.",
            )

        if decision.action == DecisionAction.GET_SOCIAL_ACTIVITY:
            return PermissionResult(
                status=PermissionStatus.ALLOWED,
                reason="Kova may retrieve social activity.",
            )

        # ------------------------------------------------------------------
        # Content creation
        # ------------------------------------------------------------------

        if decision.action == DecisionAction.CREATE_CONTENT:
            if policy.get("allow_content_creation", False):
                return PermissionResult(
                    status=PermissionStatus.ALLOWED,
                    reason="Business policy allows Kova to create content.",
                )

            return PermissionResult(
                status=PermissionStatus.DENIED,
                reason="Business policy does not allow Kova to create content.",
            )

        # ------------------------------------------------------------------
        # Content publishing
        # ------------------------------------------------------------------

        if decision.action == DecisionAction.PUBLISH_CONTENT:
            if policy.get("allow_auto_publish", False):
                return PermissionResult(
                    status=PermissionStatus.ALLOWED,
                    reason="Business policy allows Kova to publish content.",
                )

            return PermissionResult(
                status=PermissionStatus.REQUIRES_APPROVAL,
                reason=(
                    "Business policy requires approval before "
                    "Kova can publish content."
                ),
            )

        # ------------------------------------------------------------------
        # Customer responses (comments and DMs)
        # ------------------------------------------------------------------

        if decision.action == DecisionAction.RESPOND_TO_CUSTOMER:
            channel = decision.inputs.get("channel")

            if channel == "comment":
                if policy.get("allow_comment_replies", False):
                    return PermissionResult(
                        status=PermissionStatus.ALLOWED,
                        reason=(
                            "Business policy allows Kova to reply to "
                            "customer comments."
                        ),
                    )

                return PermissionResult(
                    status=PermissionStatus.DENIED,
                    reason=(
                        "Business policy does not allow Kova to reply "
                        "to customer comments."
                    ),
                )

            if channel == "dm":
                if policy.get("allow_dm_replies", False):
                    return PermissionResult(
                        status=PermissionStatus.ALLOWED,
                        reason=(
                            "Business policy allows Kova to reply to "
                            "customer direct messages."
                        ),
                    )

                return PermissionResult(
                    status=PermissionStatus.DENIED,
                    reason=(
                        "Business policy does not allow Kova to reply "
                        "to customer direct messages."
                    ),
                )

            return PermissionResult(
                status=PermissionStatus.REQUIRES_APPROVAL,
                reason=(
                    "The customer communication channel is not "
                    "explicitly authorized."
                ),
            )

        # ------------------------------------------------------------------
        # Lead creation
        # ------------------------------------------------------------------

        if decision.action == DecisionAction.CREATE_LEAD:
            if policy.get("allow_lead_creation", True):
                return PermissionResult(
                    status=PermissionStatus.ALLOWED,
                    reason="Business policy allows Kova to create leads.",
                )

            return PermissionResult(
                status=PermissionStatus.DENIED,
                reason="Business policy does not allow Kova to create leads.",
            )

        # ------------------------------------------------------------------
        # Product management
        # ------------------------------------------------------------------

        if decision.action == DecisionAction.MANAGE_PRODUCT:
            if policy.get("allow_product_management", False):
                return PermissionResult(
                    status=PermissionStatus.ALLOWED,
                    reason="Business policy allows Kova to manage products.",
                )

            return PermissionResult(
                status=PermissionStatus.DENIED,
                reason=(
                    "Business policy does not allow Kova to manage "
                    "products."
                ),
            )

        # ------------------------------------------------------------------
        # Order management
        # ------------------------------------------------------------------

        if decision.action == DecisionAction.MANAGE_ORDER:
            if policy.get("allow_order_management", False):
                return PermissionResult(
                    status=PermissionStatus.ALLOWED,
                    reason="Business policy allows Kova to manage orders.",
                )

            return PermissionResult(
                status=PermissionStatus.DENIED,
                reason=(
                    "Business policy does not allow Kova to manage "
                    "orders."
                ),
            )

        # ------------------------------------------------------------------
        # Commerce management (generic commerce operations)
        # ------------------------------------------------------------------

        if decision.action == DecisionAction.MANAGE_COMMERCE:
            commerce_action = decision.inputs.get("commerce_action")

            if commerce_action == "product":
                if policy.get("allow_product_management", False):
                    return PermissionResult(
                        status=PermissionStatus.ALLOWED,
                        reason=(
                            "Business policy allows Kova to manage "
                            "products."
                        ),
                    )

                return PermissionResult(
                    status=PermissionStatus.DENIED,
                    reason=(
                        "Business policy does not allow Kova to manage "
                        "products."
                    ),
                )

            if commerce_action == "order":
                if policy.get("allow_order_management", False):
                    return PermissionResult(
                        status=PermissionStatus.ALLOWED,
                        reason=(
                            "Business policy allows Kova to manage "
                            "orders."
                        ),
                    )

                return PermissionResult(
                    status=PermissionStatus.DENIED,
                    reason=(
                        "Business policy does not allow Kova to manage "
                        "orders."
                    ),
                )

            # Generic commerce without a sub-action: check both.
            if (
                policy.get("allow_product_management", False)
                or policy.get("allow_order_management", False)
            ):
                return PermissionResult(
                    status=PermissionStatus.ALLOWED,
                    reason=(
                        "Business policy allows commerce management."
                    ),
                )

            return PermissionResult(
                status=PermissionStatus.DENIED,
                reason=(
                    "Neither product nor order management is "
                    "authorized."
                ),
            )

        # ------------------------------------------------------------------
        # Unknown action — deny by default for security.
        # ------------------------------------------------------------------

        return PermissionResult(
            status=PermissionStatus.DENIED,
            reason=(
                "Kova does not have a registered permission rule for "
                f"the action '{decision.action}'."
            ),
        )
