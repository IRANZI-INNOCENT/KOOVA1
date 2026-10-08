"""
Kova Action Verification.

The Verification layer determines whether an executed action has
sufficient evidence of achieving its intended outcome.

V1 uses the result returned by the execution layer as its evidence.

It does not:
    - execute tools
    - make decisions
    - check permissions
    - call external APIs
    - call an AI model

External verification sources such as Meta, WhatsApp, payment
providers, and commerce systems can be added later.
"""

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision

from .types import VerificationResult, VerificationStatus


class ActionVerifier:
    """Verify the outcome of an executed Kova action."""

    def verify(
        self,
        *,
        decision: Decision,
        context: BusinessContext,
        execution_result,
    ) -> VerificationResult:
        """
        Verify an action using its execution result.

        V1 treats a successful execution result as sufficient evidence
        for verification only when the execution contains a successful
        tool result.

        Failed execution cannot be verified as successful.

        Returns:
            VerificationResult describing the available evidence.
        """

        if execution_result.failed:
            return VerificationResult(
                status=VerificationStatus.FAILED,
                message=(
                    "The action execution failed, so the intended "
                    "outcome could not be verified."
                ),
                evidence={
                    "execution_status": execution_result.status,
                },
            )

        if execution_result.tool_result is None:
            return VerificationResult(
                status=VerificationStatus.INCONCLUSIVE,
                message=(
                    "The execution succeeded but did not provide "
                    "a tool result that can be verified."
                ),
                evidence={
                    "execution_status": execution_result.status,
                },
            )

        if not execution_result.tool_result.successful:
            return VerificationResult(
                status=VerificationStatus.FAILED,
                message=(
                    "The tool did not report a successful outcome, "
                    "so the action could not be verified."
                ),
                evidence={
                    "execution_status": execution_result.status,
                    "tool_status": execution_result.tool_result.status,
                },
            )

        return VerificationResult(
            status=VerificationStatus.VERIFIED,
            message="The executed action has been verified.",
            evidence={
                "execution_status": execution_result.status,
                "tool_status": execution_result.tool_result.status,
                "tool_data": execution_result.tool_result.data,
            },
        )