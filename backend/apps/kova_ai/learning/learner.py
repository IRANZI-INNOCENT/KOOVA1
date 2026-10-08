"""
Kova Learning Engine.

The Learning Engine extracts structured learning from verified action
outcomes.

Its responsibility is:

    Verified outcome
          ↓
       Learning
          ↓
    Future memory layer

It does not:
    - execute actions
    - make permissions decisions
    - modify business data
    - persist memories
    - call an AI model

V1 only learns from VERIFIED outcomes.

Failed or inconclusive verification is not treated as a successful
business learning event.
"""

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision
from apps.kova_ai.verification.types import (
    VerificationResult,
    VerificationStatus,
)

from .types import LearningResult, LearningType


class LearningEngine:
    """Extract structured learning from verified Kova actions."""

    def learn(
        self,
        *,
        decision: Decision,
        context: BusinessContext,
        verification: VerificationResult,
    ) -> LearningResult:
        """
        Produce learning from a verification result.

        Only verified outcomes are accepted as successful learning
        events. Failed and inconclusive outcomes are represented as
        observations rather than being treated as confirmed success.

        Returns:
            LearningResult containing structured learning.

        Raises:
            ValueError: If the verification status is unsupported.
        """

        if verification.status == VerificationStatus.VERIFIED:
            return self._learn_verified(
                decision=decision,
                verification=verification,
            )

        if verification.status == VerificationStatus.FAILED:
            return LearningResult(
                learning_type=LearningType.FAILURE,
                summary=(
                    f"The action '{decision.action}' was not successfully "
                    "completed."
                ),
                action=str(decision.action),
                evidence=verification.evidence,
                confidence=1.0,
            )

        if verification.status == VerificationStatus.INCONCLUSIVE:
            return LearningResult(
                learning_type=LearningType.OBSERVATION,
                summary=(
                    f"The outcome of action '{decision.action}' "
                    "could not be conclusively verified."
                ),
                action=str(decision.action),
                evidence=verification.evidence,
                confidence=0.5,
            )

        raise ValueError(
            f"Unsupported verification status: {verification.status}"
        )

    @staticmethod
    def _learn_verified(
        *,
        decision: Decision,
        verification: VerificationResult,
    ) -> LearningResult:
        """Create learning from a verified successful outcome."""

        return LearningResult(
            learning_type=LearningType.SUCCESS,
            summary=(
                f"The action '{decision.action}' was successfully "
                "executed and verified."
            ),
            action=str(decision.action),
            evidence=verification.evidence,
            confidence=1.0,
        )