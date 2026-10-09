"""
Tests for the Kova Permission Engine.
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

from .engine import PermissionEngine
from .types import PermissionStatus


class PermissionEngineTests(TestCase):
    """Test deterministic policy-based permission evaluation."""

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

        # Provisioning auto-creates a BusinessPolicy.
        # Grab it so tests can configure it as needed.
        self.policy = BusinessPolicy.objects.get(
            business=self.business,
        )

        self.context_engine = ContextEngine()
        self.permission_engine = PermissionEngine()

    def build_context(
        self,
        *,
        task: ContextTask,
        task_context: dict | None = None,
    ):
        return self.context_engine.build(
            business_id=self.business.id,
            task=task,
            task_context=task_context,
        )

    def test_missing_policy_requires_approval(self):
        """Missing policy must never result in automatic permission."""

        # Delete the auto-provisioned policy to test the no-policy path.
        self.policy.delete()

        context = self.build_context(
            task=ContextTask.CONTENT_CREATION,
        )

        decision = Decision(
            action=DecisionAction.CREATE_CONTENT,
            status=DecisionStatus.READY,
            reason="Test decision.",
        )

        result = self.permission_engine.check(
            decision=decision,
            context=context,
        )

        self.assertEqual(
            result.status,
            PermissionStatus.REQUIRES_APPROVAL,
        )
        self.assertTrue(result.requires_approval)
        self.assertFalse(result.allowed)

    def test_content_creation_is_allowed_by_policy(self):
        """Content creation should be allowed when policy permits it."""

        self.policy.allow_content_creation = True
        self.policy.save()

        context = self.build_context(
            task=ContextTask.CONTENT_CREATION,
        )

        decision = Decision(
            action=DecisionAction.CREATE_CONTENT,
            status=DecisionStatus.READY,
            reason="Create Instagram content.",
        )

        result = self.permission_engine.check(
            decision=decision,
            context=context,
        )

        self.assertEqual(result.status, PermissionStatus.ALLOWED)
        self.assertTrue(result.allowed)
        self.assertFalse(result.requires_approval)

    def test_content_creation_is_denied_by_policy(self):
        """Content creation should be denied when policy disables it."""

        self.policy.allow_content_creation = False
        self.policy.save()

        context = self.build_context(
            task=ContextTask.CONTENT_CREATION,
        )

        decision = Decision(
            action=DecisionAction.CREATE_CONTENT,
            status=DecisionStatus.READY,
            reason="Create content.",
        )

        result = self.permission_engine.check(
            decision=decision,
            context=context,
        )

        self.assertEqual(result.status, PermissionStatus.DENIED)
        self.assertTrue(result.denied)
        self.assertFalse(result.allowed)

    def test_decision_requiring_approval_cannot_bypass_policy(self):
        """A decision requiring approval must remain gated."""

        self.policy.allow_content_creation = True
        self.policy.save()

        context = self.build_context(
            task=ContextTask.CONTENT_CREATION,
        )

        decision = Decision(
            action=DecisionAction.CREATE_CONTENT,
            status=DecisionStatus.NEEDS_APPROVAL,
            reason="Owner approval required.",
            requires_approval=True,
        )

        result = self.permission_engine.check(
            decision=decision,
            context=context,
        )

        self.assertEqual(result.status, PermissionStatus.REQUIRES_APPROVAL)

    def test_comment_reply_is_allowed(self):
        self.policy.allow_comment_replies = True
        self.policy.allow_dm_replies = False
        self.policy.save()

        context = self.build_context(
            task=ContextTask.CUSTOMER_RESPONSE,
            task_context={"channel": "comment"},
        )

        decision = Decision(
            action=DecisionAction.RESPOND_TO_CUSTOMER,
            status=DecisionStatus.READY,
            reason="Reply to comment.",
            inputs={"channel": "comment"},
        )

        result = self.permission_engine.check(
            decision=decision,
            context=context,
        )

        self.assertEqual(result.status, PermissionStatus.ALLOWED)

    def test_comment_reply_is_denied(self):
        self.policy.allow_comment_replies = False
        self.policy.allow_dm_replies = False
        self.policy.save()

        context = self.build_context(
            task=ContextTask.CUSTOMER_RESPONSE,
            task_context={"channel": "comment"},
        )

        decision = Decision(
            action=DecisionAction.RESPOND_TO_CUSTOMER,
            status=DecisionStatus.READY,
            reason="Reply to comment.",
            inputs={"channel": "comment"},
        )

        result = self.permission_engine.check(
            decision=decision,
            context=context,
        )

        self.assertEqual(result.status, PermissionStatus.DENIED)

    def test_dm_reply_is_allowed(self):
        self.policy.allow_comment_replies = False
        self.policy.allow_dm_replies = True
        self.policy.save()

        context = self.build_context(
            task=ContextTask.CUSTOMER_RESPONSE,
            task_context={"channel": "dm"},
        )

        decision = Decision(
            action=DecisionAction.RESPOND_TO_CUSTOMER,
            status=DecisionStatus.READY,
            reason="Reply to DM.",
            inputs={"channel": "dm"},
        )

        result = self.permission_engine.check(
            decision=decision,
            context=context,
        )

        self.assertEqual(result.status, PermissionStatus.ALLOWED)

    def test_dm_reply_is_denied(self):
        self.policy.allow_comment_replies = False
        self.policy.allow_dm_replies = False
        self.policy.save()

        context = self.build_context(
            task=ContextTask.CUSTOMER_RESPONSE,
            task_context={"channel": "dm"},
        )

        decision = Decision(
            action=DecisionAction.RESPOND_TO_CUSTOMER,
            status=DecisionStatus.READY,
            reason="Reply to DM.",
            inputs={"channel": "dm"},
        )

        result = self.permission_engine.check(
            decision=decision,
            context=context,
        )

        self.assertEqual(result.status, PermissionStatus.DENIED)

    def test_product_management_is_allowed(self):
        self.policy.allow_product_management = True
        self.policy.allow_order_management = False
        self.policy.save()

        context = self.build_context(task=ContextTask.COMMERCE)

        decision = Decision(
            action=DecisionAction.MANAGE_COMMERCE,
            status=DecisionStatus.READY,
            reason="Manage product.",
        )

        result = self.permission_engine.check(
            decision=decision,
            context=context,
        )

        self.assertEqual(result.status, PermissionStatus.ALLOWED)

    def test_order_management_is_allowed(self):
        self.policy.allow_product_management = False
        self.policy.allow_order_management = True
        self.policy.save()

        context = self.build_context(task=ContextTask.COMMERCE)

        decision = Decision(
            action=DecisionAction.MANAGE_COMMERCE,
            status=DecisionStatus.READY,
            reason="Manage order.",
        )

        result = self.permission_engine.check(
            decision=decision,
            context=context,
        )

        self.assertEqual(result.status, PermissionStatus.ALLOWED)

    def test_commerce_is_denied_when_management_is_disabled(self):
        self.policy.allow_product_management = False
        self.policy.allow_order_management = False
        self.policy.save()

        context = self.build_context(task=ContextTask.COMMERCE)

        decision = Decision(
            action=DecisionAction.MANAGE_COMMERCE,
            status=DecisionStatus.READY,
            reason="Manage commerce.",
        )

        result = self.permission_engine.check(
            decision=decision,
            context=context,
        )

        self.assertEqual(result.status, PermissionStatus.DENIED)

    def test_unsupported_action_is_denied(self):
        context = self.build_context(
            task=ContextTask.CONTENT_CREATION,
        )

        decision = Decision(
            action="unsupported_action",
            status=DecisionStatus.READY,
            reason="Unsupported action.",
        )

        result = self.permission_engine.check(
            decision=decision,
            context=context,
        )

        self.assertEqual(result.status, PermissionStatus.DENIED)

    def test_permission_check_does_not_modify_policy(self):
        self.policy.allow_content_creation = True
        self.policy.save()

        context = self.build_context(
            task=ContextTask.CONTENT_CREATION,
        )

        decision = Decision(
            action=DecisionAction.CREATE_CONTENT,
            status=DecisionStatus.READY,
            reason="Create content.",
        )

        self.permission_engine.check(
            decision=decision,
            context=context,
        )

        self.policy.refresh_from_db()
        self.assertTrue(self.policy.allow_content_creation)
