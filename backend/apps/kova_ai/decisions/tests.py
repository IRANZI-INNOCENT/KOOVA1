"""
Tests for the Kova Decision Engine.
"""

from django.test import TestCase

from apps.accounts.models import User
from apps.business_brain.models import BusinessPolicy
from apps.businesses.models import Business
from apps.kova_ai.context.engine import ContextEngine
from apps.kova_ai.context.types import ContextTask

from .engine import DecisionEngine
from .types import (
    DecisionAction,
    DecisionStatus,
)


class DecisionEngineTests(TestCase):
    """Test deterministic decision making."""

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
        self.decision_engine = DecisionEngine()

    def build_context(
        self,
        *,
        task: ContextTask,
        task_context: dict | None = None,
    ):
        """Build context for the decision tests."""

        return self.context_engine.build(
            business_id=self.business.id,
            task=task,
            task_context=task_context,
        )

    def test_content_creation_requires_policy(self):
        """Content creation should require business policy."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).delete()

        context = self.build_context(
            task=ContextTask.CONTENT_CREATION,
        )

        decision = self.decision_engine.decide(
            context=context,
        )

        self.assertEqual(
            decision.action,
            DecisionAction.CREATE_CONTENT,
        )
        self.assertEqual(
            decision.status,
            DecisionStatus.NEEDS_INFORMATION,
        )
        self.assertTrue(
            "policy" in decision.reason.lower()
        )

    def test_content_creation_is_ready_when_allowed(self):
        """Kova should be ready when content creation is allowed."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(allow_content_creation=True)

        context = self.build_context(
            task=ContextTask.CONTENT_CREATION,
            task_context={
                "platform": "instagram",
                "product_id": 42,
            },
        )

        decision = self.decision_engine.decide(
            context=context,
        )

        self.assertEqual(
            decision.action,
            DecisionAction.CREATE_CONTENT,
        )
        self.assertEqual(
            decision.status,
            DecisionStatus.READY,
        )
        self.assertFalse(
            decision.requires_approval
        )
        self.assertEqual(
            decision.inputs["platform"],
            "instagram",
        )
        self.assertEqual(
            decision.inputs["product_id"],
            42,
        )

    def test_content_creation_requires_approval_when_disallowed(self):
        """Disallowed content creation should require approval."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(allow_content_creation=False)

        context = self.build_context(
            task=ContextTask.CONTENT_CREATION,
        )

        decision = self.decision_engine.decide(
            context=context,
        )

        self.assertEqual(
            decision.action,
            DecisionAction.CREATE_CONTENT,
        )
        self.assertEqual(
            decision.status,
            DecisionStatus.NEEDS_APPROVAL,
        )
        self.assertTrue(
            decision.requires_approval
        )

    def test_customer_response_requires_policy(self):
        """Customer responses should require business policy."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).delete()

        context = self.build_context(
            task=ContextTask.CUSTOMER_RESPONSE,
        )

        decision = self.decision_engine.decide(
            context=context,
        )

        self.assertEqual(
            decision.action,
            DecisionAction.RESPOND_TO_CUSTOMER,
        )
        self.assertEqual(
            decision.status,
            DecisionStatus.NEEDS_INFORMATION,
        )

    def test_customer_response_is_ready_when_comments_are_allowed(self):
        """Comment replies should be allowed when policy permits them."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(
            allow_comment_replies=True,
            allow_dm_replies=False,
        )

        context = self.build_context(
            task=ContextTask.CUSTOMER_RESPONSE,
        )

        decision = self.decision_engine.decide(
            context=context,
        )

        self.assertEqual(
            decision.action,
            DecisionAction.RESPOND_TO_CUSTOMER,
        )
        self.assertEqual(
            decision.status,
            DecisionStatus.READY,
        )
        self.assertFalse(
            decision.requires_approval
        )

    def test_customer_response_is_ready_when_dms_are_allowed(self):
        """DM replies should be allowed when policy permits them."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(
            allow_comment_replies=False,
            allow_dm_replies=True,
        )

        context = self.build_context(
            task=ContextTask.CUSTOMER_RESPONSE,
        )

        decision = self.decision_engine.decide(
            context=context,
        )

        self.assertEqual(
            decision.action,
            DecisionAction.RESPOND_TO_CUSTOMER,
        )
        self.assertEqual(
            decision.status,
            DecisionStatus.READY,
        )

    def test_customer_response_requires_approval_when_disallowed(self):
        """Customer responses should require approval when disabled."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(
            allow_comment_replies=False,
            allow_dm_replies=False,
        )

        context = self.build_context(
            task=ContextTask.CUSTOMER_RESPONSE,
        )

        decision = self.decision_engine.decide(
            context=context,
        )

        self.assertEqual(
            decision.action,
            DecisionAction.RESPOND_TO_CUSTOMER,
        )
        self.assertEqual(
            decision.status,
            DecisionStatus.NEEDS_APPROVAL,
        )
        self.assertTrue(
            decision.requires_approval
        )

    def test_commerce_requires_policy(self):
        """Commerce operations should require business policy."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).delete()

        context = self.build_context(
            task=ContextTask.COMMERCE,
        )

        decision = self.decision_engine.decide(
            context=context,
        )

        self.assertEqual(
            decision.action,
            DecisionAction.MANAGE_COMMERCE,
        )
        self.assertEqual(
            decision.status,
            DecisionStatus.NEEDS_INFORMATION,
        )

    def test_commerce_is_ready_when_product_management_is_allowed(self):
        """Product management should enable commerce decisions."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(
            allow_product_management=True,
            allow_order_management=False,
        )

        context = self.build_context(
            task=ContextTask.COMMERCE,
            task_context={
                "operation": "create_product",
            },
        )

        decision = self.decision_engine.decide(
            context=context,
        )

        self.assertEqual(
            decision.action,
            DecisionAction.MANAGE_COMMERCE,
        )
        self.assertEqual(
            decision.status,
            DecisionStatus.READY,
        )
        self.assertEqual(
            decision.inputs["operation"],
            "create_product",
        )

    def test_commerce_is_ready_when_order_management_is_allowed(self):
        """Order management should enable commerce decisions."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(
            allow_product_management=False,
            allow_order_management=True,
        )

        context = self.build_context(
            task=ContextTask.COMMERCE,
        )

        decision = self.decision_engine.decide(
            context=context,
        )

        self.assertEqual(
            decision.action,
            DecisionAction.MANAGE_COMMERCE,
        )
        self.assertEqual(
            decision.status,
            DecisionStatus.READY,
        )

    def test_commerce_requires_approval_when_management_is_disallowed(self):
        """Commerce should require approval when management is disabled."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(
            allow_product_management=False,
            allow_order_management=False,
        )

        context = self.build_context(
            task=ContextTask.COMMERCE,
        )

        decision = self.decision_engine.decide(
            context=context,
        )

        self.assertEqual(
            decision.action,
            DecisionAction.MANAGE_COMMERCE,
        )
        self.assertEqual(
            decision.status,
            DecisionStatus.NEEDS_APPROVAL,
        )
        self.assertTrue(
            decision.requires_approval
        )

    def test_unsupported_task_raises_error(self):
        """GENERAL should not silently produce a decision."""

        context = self.build_context(
            task=ContextTask.GENERAL,
        )

        with self.assertRaises(ValueError):
            self.decision_engine.decide(
                context=context,
            )

    def test_decision_does_not_execute_actions(self):
        """
        Decision making should only describe intent.

        The engine must not perform external actions or mutate the
        business state.
        """

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(allow_content_creation=True)

        context = self.build_context(
            task=ContextTask.CONTENT_CREATION,
        )

        before_count = BusinessPolicy.objects.count()

        self.decision_engine.decide(
            context=context,
        )

        after_count = BusinessPolicy.objects.count()

        self.assertEqual(
            before_count,
            after_count,
        )