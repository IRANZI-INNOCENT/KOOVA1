"""
Tests for the Kova Context Engine.
"""

from django.test import TestCase

from apps.accounts.models import User
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
)
from .engine import ContextEngine
from .types import ContextTask


class TaskDefinitionTests(TestCase):
    """Test the context requirements declared for each Kova task."""

    def test_all_context_tasks_have_definitions(self):
        """Every supported ContextTask must have a task definition."""

        for task in ContextTask:
            self.assertIn(
                task,
                TASK_DEFINITIONS,
            )

    def test_task_definitions_are_immutable(self):
        """Task definitions should not be mutable at runtime."""

        definition = TASK_DEFINITIONS[ContextTask.CONTENT_CREATION]

        with self.assertRaises(AttributeError):
            definition.task = ContextTask.GENERAL

    def test_general_requires_all_core_context(self):
        """GENERAL should have access to the complete Business Brain."""

        definition = TASK_DEFINITIONS[ContextTask.GENERAL]

        self.assertEqual(
            definition.requirements,
            frozenset(
                {
                    ContextRequirement.BUSINESS,
                    ContextRequirement.PROFILE,
                    ContextRequirement.AUDIENCE,
                    ContextRequirement.BRAND,
                    ContextRequirement.GOALS,
                    ContextRequirement.POLICY,
                    ContextRequirement.MARKET,
                    ContextRequirement.PRODUCTS,
                    ContextRequirement.COMMERCE_PAGE,
                }
            ),
        )

    def test_content_creation_requires_relevant_context(self):
        """Content creation should use brand, audience, goals and policy."""

        definition = TASK_DEFINITIONS[
            ContextTask.CONTENT_CREATION
        ]

        self.assertEqual(
            definition.requirements,
            frozenset(
                {
                    ContextRequirement.BUSINESS,
                    ContextRequirement.BRAND,
                    ContextRequirement.AUDIENCE,
                    ContextRequirement.GOALS,
                    ContextRequirement.POLICY,
                    ContextRequirement.MARKET,
                    ContextRequirement.PRODUCTS,
                }
            ),
        )

        self.assertNotIn(
            ContextRequirement.PROFILE,
            definition.requirements,
        )

    def test_customer_response_requires_relevant_context(self):
        """Customer responses should use brand and policy."""

        definition = TASK_DEFINITIONS[
            ContextTask.CUSTOMER_RESPONSE
        ]

        self.assertEqual(
            definition.requirements,
            frozenset(
                {
                    ContextRequirement.BUSINESS,
                    ContextRequirement.BRAND,
                    ContextRequirement.POLICY,
                    ContextRequirement.MARKET,
                    ContextRequirement.PRODUCTS,
                }
            ),
        )

    def test_commerce_requires_relevant_context(self):
        """Commerce operations should use goals and policy."""

        definition = TASK_DEFINITIONS[
            ContextTask.COMMERCE
        ]

        self.assertEqual(
            definition.requirements,
            frozenset(
                {
                    ContextRequirement.BUSINESS,
                    ContextRequirement.GOALS,
                    ContextRequirement.POLICY,
                    ContextRequirement.MARKET,
                    ContextRequirement.PRODUCTS,
                    ContextRequirement.COMMERCE_PAGE,
                }
            ),
        )


class ContextEngineTests(TestCase):
    """Test deterministic, task-aware business context assembly."""

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
            email="business@example.com",
            phone="+254700000000",
        )

        self.engine = ContextEngine()

    def test_builds_basic_business_context(self):
        """The engine should always include the base business."""

        context = self.engine.build(
            business_id=self.business.id,
        )

        self.assertEqual(
            context.business["id"],
            self.business.id,
        )
        self.assertEqual(
            context.business["name"],
            "Test Business",
        )
        self.assertEqual(
            context.business["industry"],
            "Retail",
        )
        self.assertEqual(
            context.task,
            ContextTask.GENERAL,
        )

    def test_missing_business_brain_records_are_allowed(self):
        """
        Context assembly should still work when optional Business Brain
        configuration has not been completed.
        """

        BusinessProfile.objects.filter(business=self.business).delete()
        BusinessAudience.objects.filter(business=self.business).delete()
        BusinessBrand.objects.filter(business=self.business).delete()
        BusinessGoal.objects.filter(business=self.business).delete()
        BusinessPolicy.objects.filter(business=self.business).delete()

        context = self.engine.build(
            business_id=self.business.id,
        )

        self.assertIsNone(context.profile)
        self.assertIsNone(context.audience)
        self.assertIsNone(context.brand)
        self.assertIsNone(context.goals)
        self.assertIsNone(context.policy)

    def test_general_loads_all_core_context(self):
        """GENERAL should load all core Business Brain entities."""

        BusinessProfile.objects.filter(
            business=self.business,
        ).update(mission="Help businesses grow.")

        BusinessAudience.objects.filter(
            business=self.business,
        ).update(primary_audience="Small business owners")

        BusinessBrand.objects.filter(
            business=self.business,
        ).update(voice="Helpful")

        BusinessGoal.objects.filter(
            business=self.business,
        ).update(primary_goal="Increase sales")

        context = self.engine.build(
            business_id=self.business.id,
            task=ContextTask.GENERAL,
        )

        self.assertIsNotNone(context.profile)
        self.assertIsNotNone(context.audience)
        self.assertIsNotNone(context.brand)
        self.assertIsNotNone(context.goals)
        self.assertIsNotNone(context.policy)

    def test_content_creation_loads_only_required_context(self):
        """
        Content creation should load the context declared by its task
        definition and leave unrelated context unset.
        """

        BusinessProfile.objects.filter(
            business=self.business,
        ).update(mission="Help businesses grow.")

        BusinessAudience.objects.filter(
            business=self.business,
        ).update(primary_audience="Small business owners")

        BusinessBrand.objects.filter(
            business=self.business,
        ).update(voice="Helpful")

        BusinessGoal.objects.filter(
            business=self.business,
        ).update(primary_goal="Increase sales")

        context = self.engine.build(
            business_id=self.business.id,
            task=ContextTask.CONTENT_CREATION,
        )

        self.assertIsNone(context.profile)
        self.assertIsNotNone(context.audience)
        self.assertIsNotNone(context.brand)
        self.assertIsNotNone(context.goals)
        self.assertIsNotNone(context.policy)

    def test_customer_response_loads_only_required_context(self):
        """
        Customer responses should not load unrelated audience or goals
        context in V1.
        """

        BusinessProfile.objects.filter(
            business=self.business,
        ).update(mission="Help businesses grow.")

        BusinessAudience.objects.filter(
            business=self.business,
        ).update(primary_audience="Small business owners")

        BusinessBrand.objects.filter(
            business=self.business,
        ).update(voice="Helpful")

        BusinessGoal.objects.filter(
            business=self.business,
        ).update(primary_goal="Increase sales")

        context = self.engine.build(
            business_id=self.business.id,
            task=ContextTask.CUSTOMER_RESPONSE,
        )

        self.assertIsNone(context.profile)
        self.assertIsNone(context.audience)
        self.assertIsNotNone(context.brand)
        self.assertIsNone(context.goals)
        self.assertIsNotNone(context.policy)

    def test_commerce_loads_only_required_context(self):
        """Commerce should load goals and policy alongside the business."""

        BusinessProfile.objects.filter(
            business=self.business,
        ).update(mission="Help businesses grow.")

        BusinessAudience.objects.filter(
            business=self.business,
        ).update(primary_audience="Small business owners")

        BusinessBrand.objects.filter(
            business=self.business,
        ).update(voice="Helpful")

        BusinessGoal.objects.filter(
            business=self.business,
        ).update(primary_goal="Increase sales")

        context = self.engine.build(
            business_id=self.business.id,
            task=ContextTask.COMMERCE,
        )

        self.assertIsNone(context.profile)
        self.assertIsNone(context.audience)
        self.assertIsNone(context.brand)
        self.assertIsNotNone(context.goals)
        self.assertIsNotNone(context.policy)

    def test_includes_business_profile_when_required(self):
        """Business Profile should become part of the context."""

        BusinessProfile.objects.filter(
            business=self.business,
        ).update(
            mission="Help businesses grow.",
            value_proposition="Simple business tools.",
            target_market="Small businesses",
            business_model="Subscription",
            business_stage="Early stage",
            website="https://example.com",
        )

        context = self.engine.build(
            business_id=self.business.id,
            task=ContextTask.GENERAL,
        )

        self.assertIsNotNone(context.profile)
        self.assertEqual(
            context.profile["mission"],
            "Help businesses grow.",
        )
        self.assertEqual(
            context.profile["target_market"],
            "Small businesses",
        )

    def test_includes_business_audience_when_required(self):
        """Business Audience should become part of the context."""

        BusinessAudience.objects.filter(
            business=self.business,
        ).update(
            primary_audience="Small business owners",
            customer_needs="Affordable marketing",
            pain_points="Limited marketing capacity",
            buying_motivations="More sales",
            customer_behavior="Mostly social-first",
            preferred_channels="Instagram and WhatsApp",
        )

        context = self.engine.build(
            business_id=self.business.id,
            task=ContextTask.CONTENT_CREATION,
        )

        self.assertIsNotNone(context.audience)
        self.assertEqual(
            context.audience["primary_audience"],
            "Small business owners",
        )

    def test_includes_business_brand_when_required(self):
        """Business Brand should become part of the context."""

        BusinessBrand.objects.filter(
            business=self.business,
        ).update(
            voice="Helpful",
            tone="Professional but friendly",
            positioning="Simple tools for growing businesses",
            brand_personality="Practical and trustworthy",
            content_style="Clear and concise",
            communication_preferences="Avoid exaggerated claims",
        )

        context = self.engine.build(
            business_id=self.business.id,
            task=ContextTask.CONTENT_CREATION,
        )

        self.assertIsNotNone(context.brand)
        self.assertEqual(
            context.brand["voice"],
            "Helpful",
        )
        self.assertEqual(
            context.brand["tone"],
            "Professional but friendly",
        )

    def test_includes_business_goals_when_required(self):
        """Business Goals should become part of the context."""

        BusinessGoal.objects.filter(
            business=self.business,
        ).update(
            primary_goal="Increase monthly sales",
            secondary_goals="Grow customer base",
            growth_priorities="Online sales",
            success_metrics="Monthly revenue",
            current_challenges="Customer acquisition",
            time_horizon="3-5 years",
        )

        context = self.engine.build(
            business_id=self.business.id,
            task=ContextTask.COMMERCE,
        )

        self.assertIsNotNone(context.goals)
        self.assertEqual(
            context.goals["primary_goal"],
            "Increase monthly sales",
        )

    def test_includes_business_policy_when_required(self):
        """Business Policy should become part of operational context."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(
            allow_content_creation=True,
            allow_auto_publish=False,
            allow_comment_replies=False,
            allow_dm_replies=False,
            allow_lead_creation=True,
            allow_product_management=False,
            allow_order_management=False,
            require_discount_approval=True,
            max_auto_discount_percent=20,
            require_refund_approval=True,
            require_payment_approval=True,
        )

        context = self.engine.build(
            business_id=self.business.id,
            task=ContextTask.COMMERCE,
        )

        self.assertIsNotNone(context.policy)
        self.assertTrue(
            context.policy["allow_content_creation"]
        )
        self.assertFalse(
            context.policy["allow_auto_publish"]
        )
        self.assertEqual(
            context.policy["max_auto_discount_percent"],
            20,
        )

    def test_context_excludes_database_metadata(self):
        """
        Persistence metadata should not be exposed as business context.
        """

        BusinessBrand.objects.filter(
            business=self.business,
        ).update(voice="Helpful")

        context = self.engine.build(
            business_id=self.business.id,
            task=ContextTask.CONTENT_CREATION,
        )

        self.assertNotIn("id", context.brand)
        self.assertNotIn("business", context.brand)
        self.assertNotIn("created_at", context.brand)
        self.assertNotIn("updated_at", context.brand)

    def test_supports_task_context(self):
        """Task-specific information should be preserved separately."""

        context = self.engine.build(
            business_id=self.business.id,
            task=ContextTask.CONTENT_CREATION,
            task_context={
                "platform": "instagram",
                "product_id": 42,
            },
        )

        self.assertEqual(
            context.task,
            ContextTask.CONTENT_CREATION,
        )
        self.assertEqual(
            context.task_context["platform"],
            "instagram",
        )
        self.assertEqual(
            context.task_context["product_id"],
            42,
        )

    def test_missing_business_raises_error(self):
        """Unknown businesses should not silently produce empty context."""

        with self.assertRaises(Business.DoesNotExist):
            self.engine.build(
                business_id=999999,
            )