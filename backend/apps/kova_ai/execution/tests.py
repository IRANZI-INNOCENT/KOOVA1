"""
Tests for the Kova Action Executor.
"""

from django.test import TestCase

from apps.accounts.models import User
from apps.business_brain.models import BusinessPolicy
from apps.businesses.models import Business
from apps.kova_ai.context.engine import ContextEngine
from apps.kova_ai.context.types import ContextTask
from apps.kova_ai.decisions.types import (
    Decision,
    DecisionAction,
    DecisionStatus,
)
from apps.kova_ai.permissions.engine import PermissionEngine
from apps.kova_ai.tools.base import Tool
from apps.kova_ai.tools.registry import ToolRegistry
from apps.kova_ai.tools.types import ToolResult, ToolStatus

from .executor import ActionExecutor
from .types import ExecutionStatus


class SuccessfulTool(Tool):
    """Test tool that completes successfully."""

    @property
    def action(self) -> str:
        """Return the action supported by this tool."""

        return DecisionAction.CREATE_CONTENT

    def execute(
        self,
        *,
        decision,
        context,
        arguments=None,
    ) -> ToolResult:
        """Return a successful result."""

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Content created successfully.",
            data={
                "content_id": 123,
            },
        )


class FailedTool(Tool):
    """Test tool that reports an execution failure."""

    @property
    def action(self) -> str:
        """Return the action supported by this tool."""

        return DecisionAction.CREATE_CONTENT

    def execute(
        self,
        *,
        decision,
        context,
        arguments=None,
    ) -> ToolResult:
        """Return a failed result."""

        return ToolResult(
            status=ToolStatus.FAILED,
            message="External service failed.",
        )


class RaisingTool(Tool):
    """Test tool that raises an unexpected exception."""

    @property
    def action(self) -> str:
        """Return the action supported by this tool."""

        return DecisionAction.CREATE_CONTENT

    def execute(
        self,
        *,
        decision,
        context,
        arguments=None,
    ) -> ToolResult:
        """Raise an execution error."""

        raise RuntimeError("Unexpected tool failure.")


class ActionExecutorTests(TestCase):
    """Test the Kova action execution lifecycle."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="test-password",
            first_name="Test",
            last_name="Owner",
        )

        self.business = Business.objects.create(
            owner=self.user,
            name="Test Business",
            description="A test business.",
            industry="Retail",
            location="Nairobi",
        )

        self.context_engine = ContextEngine()
        self.permission_engine = PermissionEngine()

        self.registry = ToolRegistry()

        self.executor = ActionExecutor(
            tool_registry=self.registry,
            permission_engine=self.permission_engine,
        )

    def build_context(self):
        """Build content creation context."""

        return self.context_engine.build(
            business_id=self.business.id,
            task=ContextTask.CONTENT_CREATION,
        )

    def build_decision(self):
        """Build an authorized content creation decision."""

        return Decision(
            action=DecisionAction.CREATE_CONTENT,
            status=DecisionStatus.READY,
            reason="Create content.",
        )

    def test_successful_execution(self):
        """An authorized successful tool should produce success."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(allow_content_creation=True)

        self.registry.register(
            SuccessfulTool(),
        )

        result = self.executor.execute(
            decision=self.build_decision(),
            context=self.build_context(),
        )

        self.assertEqual(
            result.status,
            ExecutionStatus.SUCCEEDED,
        )
        self.assertTrue(
            result.successful
        )
        self.assertEqual(
            result.message,
            "Content created successfully.",
        )
        self.assertEqual(
            result.data["content_id"],
            123,
        )

    def test_denied_action_does_not_execute(self):
        """A denied action must never reach the tool."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(allow_content_creation=False)

        self.registry.register(
            SuccessfulTool(),
        )

        result = self.executor.execute(
            decision=self.build_decision(),
            context=self.build_context(),
        )

        self.assertEqual(
            result.status,
            ExecutionStatus.FAILED,
        )
        self.assertTrue(
            result.failed
        )
        self.assertIn(
            "does not allow",
            result.message,
        )

    def test_missing_policy_does_not_execute(self):
        """Missing policy must prevent automatic execution."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).delete()

        self.registry.register(
            SuccessfulTool(),
        )

        result = self.executor.execute(
            decision=self.build_decision(),
            context=self.build_context(),
        )

        self.assertEqual(
            result.status,
            ExecutionStatus.FAILED,
        )
        self.assertIn(
            "policy",
            result.message.lower(),
        )

    def test_approval_required_does_not_execute(self):
        """Approval-gated decisions must not reach the tool."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(allow_content_creation=True)

        self.registry.register(
            SuccessfulTool(),
        )

        decision = Decision(
            action=DecisionAction.CREATE_CONTENT,
            status=DecisionStatus.NEEDS_APPROVAL,
            reason="Owner approval required.",
            requires_approval=True,
        )

        result = self.executor.execute(
            decision=decision,
            context=self.build_context(),
        )

        self.assertEqual(
            result.status,
            ExecutionStatus.FAILED,
        )
        self.assertIn(
            "approval",
            result.message.lower(),
        )

    def test_missing_tool_fails_safely(self):
        """An authorized action without a tool should fail safely."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(allow_content_creation=True)

        result = self.executor.execute(
            decision=self.build_decision(),
            context=self.build_context(),
        )

        self.assertEqual(
            result.status,
            ExecutionStatus.FAILED,
        )
        self.assertIn(
            "no tool",
            result.message.lower(),
        )

    def test_tool_failure_becomes_execution_failure(self):
        """A failed ToolResult should become a failed execution."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(allow_content_creation=True)

        self.registry.register(
            FailedTool(),
        )

        result = self.executor.execute(
            decision=self.build_decision(),
            context=self.build_context(),
        )

        self.assertEqual(
            result.status,
            ExecutionStatus.FAILED,
        )
        self.assertEqual(
            result.message,
            "External service failed.",
        )
        self.assertIsNotNone(
            result.tool_result,
        )

    def test_unexpected_tool_exception_becomes_execution_failure(self):
        """Unexpected tool errors should not escape the execution layer."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(allow_content_creation=True)

        self.registry.register(
            RaisingTool(),
        )

        result = self.executor.execute(
            decision=self.build_decision(),
            context=self.build_context(),
        )

        self.assertEqual(
            result.status,
            ExecutionStatus.FAILED,
        )
        self.assertIn(
            "unexpected tool failure",
            result.message.lower(),
        )

    def test_execution_result_does_not_claim_verification(self):
        """
        Successful execution must not imply that the external outcome
        has been verified.
        """

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(allow_content_creation=True)

        self.registry.register(
            SuccessfulTool(),
        )

        result = self.executor.execute(
            decision=self.build_decision(),
            context=self.build_context(),
        )

        self.assertEqual(
            result.status,
            ExecutionStatus.SUCCEEDED,
        )

        self.assertNotIn(
            "verified",
            result.message.lower(),
        )