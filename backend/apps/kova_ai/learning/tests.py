"""
Tests for the Kova Learning Engine.
"""

from django.test import SimpleTestCase

from apps.kova_ai.context.types import BusinessContext, ContextTask
from apps.kova_ai.decisions.types import (
    Decision,
    DecisionAction,
    DecisionStatus,
)
from apps.kova_ai.verification.types import (
    VerificationResult,
    VerificationStatus,
)

from .learner import LearningEngine
from .types import LearningType


class LearningEngineTests(SimpleTestCase):
    """Test Kova's initial learning behavior."""

    def setUp(self):
        self.engine = LearningEngine()

        self.context = BusinessContext(
            business={
                "id": 1,
                "name": "Test Business",
            },
            profile=None,
            audience=None,
            brand=None,
            goals=None,
            policy={
                "allow_content_creation": True,
            },
            task=ContextTask.CONTENT_CREATION,
        )

        self.decision = Decision(
            action=DecisionAction.CREATE_CONTENT,
            status=DecisionStatus.READY,
            reason="Create content.",
        )

    def test_verified_success_produces_success_learning(self):
        """A verified action should produce successful learning."""

        verification = VerificationResult(
            status=VerificationStatus.VERIFIED,
            message="The action has been verified.",
            evidence={
                "content_id": 123,
                "platform": "instagram",
            },
        )

        result = self.engine.learn(
            decision=self.decision,
            context=self.context,
            verification=verification,
        )

        self.assertEqual(
            result.learning_type,
            LearningType.SUCCESS,
        )
        self.assertTrue(
            result.is_success,
        )
        self.assertFalse(
            result.is_failure,
        )
        self.assertEqual(
            result.action,
            str(DecisionAction.CREATE_CONTENT),
        )
        self.assertEqual(
            result.confidence,
            1.0,
        )

    def test_verified_learning_preserves_evidence(self):
        """Verified evidence should be preserved in the learning result."""

        verification = VerificationResult(
            status=VerificationStatus.VERIFIED,
            message="The action has been verified.",
            evidence={
                "content_id": 456,
                "platform": "facebook",
            },
        )

        result = self.engine.learn(
            decision=self.decision,
            context=self.context,
            verification=verification,
        )

        self.assertEqual(
            result.evidence["content_id"],
            456,
        )
        self.assertEqual(
            result.evidence["platform"],
            "facebook",
        )

    def test_failed_verification_produces_failure_learning(self):
        """A failed action should produce failure learning."""

        verification = VerificationResult(
            status=VerificationStatus.FAILED,
            message="The action failed.",
            evidence={
                "error": "External service unavailable.",
            },
        )

        result = self.engine.learn(
            decision=self.decision,
            context=self.context,
            verification=verification,
        )

        self.assertEqual(
            result.learning_type,
            LearningType.FAILURE,
        )
        self.assertTrue(
            result.is_failure,
        )
        self.assertFalse(
            result.is_success,
        )
        self.assertEqual(
            result.confidence,
            1.0,
        )

    def test_inconclusive_verification_produces_observation(self):
        """
        An inconclusive outcome should not be treated as a confirmed
        success or failure.
        """

        verification = VerificationResult(
            status=VerificationStatus.INCONCLUSIVE,
            message="The outcome could not be verified.",
            evidence={
                "reason": "No external confirmation available.",
            },
        )

        result = self.engine.learn(
            decision=self.decision,
            context=self.context,
            verification=verification,
        )

        self.assertEqual(
            result.learning_type,
            LearningType.OBSERVATION,
        )
        self.assertFalse(
            result.is_success,
        )
        self.assertFalse(
            result.is_failure,
        )
        self.assertEqual(
            result.confidence,
            0.5,
        )

    def test_learning_does_not_modify_context(self):
        """Learning must not modify the supplied business context."""

        original_policy = dict(
            self.context.policy,
        )

        verification = VerificationResult(
            status=VerificationStatus.VERIFIED,
            message="The action has been verified.",
        )

        self.engine.learn(
            decision=self.decision,
            context=self.context,
            verification=verification,
        )

        self.assertEqual(
            self.context.policy,
            original_policy,
        )

    def test_learning_does_not_persist_data(self):
        """
        Learning V1 must remain an in-memory operation.

        There are intentionally no database writes in the learning
        layer.
        """

        verification = VerificationResult(
            status=VerificationStatus.VERIFIED,
            message="The action has been verified.",
        )

        result = self.engine.learn(
            decision=self.decision,
            context=self.context,
            verification=verification,
        )

        self.assertIsNotNone(
            result,
        )