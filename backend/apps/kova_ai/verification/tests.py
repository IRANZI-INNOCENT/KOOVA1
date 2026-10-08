"""
Tests for the Kova Verification layer.
"""

from django.test import SimpleTestCase

from apps.kova_ai.context.types import BusinessContext, ContextTask
from apps.kova_ai.decisions.types import Decision, DecisionAction, DecisionStatus
from apps.kova_ai.tools.types import ToolResult, ToolStatus

from apps.kova_ai.execution.types import ExecutionResult, ExecutionStatus

from .types import VerificationStatus
from .verifier import ActionVerifier


class ActionVerifierTests(SimpleTestCase):
    """Test Kova action verification."""

    def setUp(self):
        self.verifier = ActionVerifier()

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

    def test_successful_execution_is_verified(self):
        """A successful tool result should be verified in V1."""

        tool_result = ToolResult(
            status=ToolStatus.SUCCESS,
            message="Content created successfully.",
            data={
                "content_id": 123,
            },
        )

        execution_result = ExecutionResult(
            status=ExecutionStatus.SUCCEEDED,
            message="Content created successfully.",
            tool_result=tool_result,
            data=tool_result.data,
        )

        result = self.verifier.verify(
            decision=self.decision,
            context=self.context,
            execution_result=execution_result,
        )

        self.assertEqual(
            result.status,
            VerificationStatus.VERIFIED,
        )
        self.assertTrue(result.verified)
        self.assertFalse(result.failed)
        self.assertFalse(result.inconclusive)

    def test_failed_execution_produces_failed_verification(self):
        """A failed execution cannot produce a verified outcome."""

        execution_result = ExecutionResult(
            status=ExecutionStatus.FAILED,
            message="Tool execution failed.",
        )

        result = self.verifier.verify(
            decision=self.decision,
            context=self.context,
            execution_result=execution_result,
        )

        self.assertEqual(
            result.status,
            VerificationStatus.FAILED,
        )
        self.assertTrue(result.failed)
        self.assertFalse(result.verified)

    def test_missing_tool_result_is_inconclusive(self):
        """
        A successful execution without a tool result cannot establish
        sufficient evidence.
        """

        execution_result = ExecutionResult(
            status=ExecutionStatus.SUCCEEDED,
            message="Execution completed.",
        )

        result = self.verifier.verify(
            decision=self.decision,
            context=self.context,
            execution_result=execution_result,
        )

        self.assertEqual(
            result.status,
            VerificationStatus.INCONCLUSIVE,
        )
        self.assertTrue(result.inconclusive)
        self.assertFalse(result.verified)

    def test_failed_tool_result_produces_failed_verification(self):
        """A failed tool result should produce failed verification."""

        tool_result = ToolResult(
            status=ToolStatus.FAILED,
            message="External service failed.",
        )

        execution_result = ExecutionResult(
            status=ExecutionStatus.FAILED,
            message="External service failed.",
            tool_result=tool_result,
        )

        result = self.verifier.verify(
            decision=self.decision,
            context=self.context,
            execution_result=execution_result,
        )

        self.assertEqual(
            result.status,
            VerificationStatus.FAILED,
        )
        self.assertTrue(result.failed)

    def test_verified_result_contains_evidence(self):
        """A verified result should preserve useful execution evidence."""

        tool_result = ToolResult(
            status=ToolStatus.SUCCESS,
            message="Content created successfully.",
            data={
                "content_id": 456,
                "platform": "instagram",
            },
        )

        execution_result = ExecutionResult(
            status=ExecutionStatus.SUCCEEDED,
            message="Content created successfully.",
            tool_result=tool_result,
            data=tool_result.data,
        )

        result = self.verifier.verify(
            decision=self.decision,
            context=self.context,
            execution_result=execution_result,
        )

        self.assertEqual(
            result.evidence["tool_data"]["content_id"],
            456,
        )
        self.assertEqual(
            result.evidence["tool_data"]["platform"],
            "instagram",
        )

    def test_verification_does_not_modify_execution_result(self):
        """Verification must be observational and side-effect free."""

        tool_result = ToolResult(
            status=ToolStatus.SUCCESS,
            message="Content created successfully.",
        )

        execution_result = ExecutionResult(
            status=ExecutionStatus.SUCCEEDED,
            message="Content created successfully.",
            tool_result=tool_result,
        )

        original_status = execution_result.status

        self.verifier.verify(
            decision=self.decision,
            context=self.context,
            execution_result=execution_result,
        )

        self.assertEqual(
            execution_result.status,
            original_status,
        )