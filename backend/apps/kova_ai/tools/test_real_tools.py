"""
Tests for real database-writing agent tools.

Every tool tested here must actually persist data or read real records.
No more fake "accepted" responses.
"""

from decimal import Decimal

from django.test import TestCase

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.commerce.models import Product
from apps.content.models import Content
from apps.leads.models import Lead
from apps.kova_ai.context.types import BusinessContext, ContextTask
from apps.kova_ai.decisions.types import (
    Decision,
    DecisionAction,
    DecisionStatus,
)

from .create_lead import CreateLeadTool
from .get_analytics import GetAnalyticsTool
from .manage_commerce import ManageCommerceTool
from .manage_product import ManageProductTool
from .publish_content import PublishContentTool
from .types import ToolStatus


class RealToolTestBase(TestCase):
    """Common setup for real tool tests."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="tools@test.com",
            password="test-password",
            first_name="Tool",
            last_name="Tester",
        )
        self.business = Business.objects.create(
            owner=self.user,
            name="Real Tool Business",
            description="Testing real tools.",
            industry="Retail",
            location="Nairobi",
        )
        self.context = BusinessContext(
            business={
                "id": self.business.id,
                "name": self.business.name,
                "industry": "Retail",
            },
            profile=None,
            audience=None,
            brand=None,
            goals=None,
            policy=None,
            task=ContextTask.GENERAL,
        )

    def _decision(self, action):
        return Decision(
            action=action,
            status=DecisionStatus.READY,
            reason="Test.",
        )


class ManageProductToolTests(RealToolTestBase):
    """ManageProductTool must write real Product records."""

    def setUp(self):
        super().setUp()
        self.tool = ManageProductTool()

    def test_create_product(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.MANAGE_PRODUCT),
            context=self.context,
            arguments={
                "operation": "create",
                "name": "Test Shoe",
                "category": "Footwear",
                "price": 2500,
                "currency": "KES",
            },
        )

        self.assertEqual(result.status, ToolStatus.SUCCESS)
        product = Product.objects.get(pk=result.data["product_id"])
        self.assertEqual(product.name, "Test Shoe")
        self.assertEqual(product.category, "Footwear")
        self.assertEqual(product.price, Decimal("2500"))
        self.assertEqual(product.status, "active")
        self.assertTrue(product.business.commerce_page.is_published)
        self.assertEqual(product.business_id, self.business.id)

    def test_create_without_name_fails(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.MANAGE_PRODUCT),
            context=self.context,
            arguments={"operation": "create"},
        )
        self.assertEqual(result.status, ToolStatus.FAILED)
        self.assertEqual(Product.objects.filter(business=self.business).count(), 0)

    def test_update_product(self):
        product = Product.objects.create(
            business=self.business,
            name="Old Name",
            price=Decimal("1000"),
        )

        result = self.tool.execute(
            decision=self._decision(DecisionAction.MANAGE_PRODUCT),
            context=self.context,
            arguments={
                "operation": "update",
                "product_id": product.pk,
                "name": "New Name",
                "price": 1500,
            },
        )

        self.assertEqual(result.status, ToolStatus.SUCCESS)
        product.refresh_from_db()
        self.assertEqual(product.name, "New Name")
        self.assertEqual(product.price, Decimal("1500"))

    def test_update_nonexistent_product_fails(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.MANAGE_PRODUCT),
            context=self.context,
            arguments={"operation": "update", "product_id": 99999, "name": "X"},
        )
        self.assertEqual(result.status, ToolStatus.FAILED)

    def test_archive_product(self):
        product = Product.objects.create(
            business=self.business,
            name="To Archive",
            status=Product.Status.ACTIVE,
        )

        result = self.tool.execute(
            decision=self._decision(DecisionAction.MANAGE_PRODUCT),
            context=self.context,
            arguments={"operation": "archive", "product_id": product.pk},
        )

        self.assertEqual(result.status, ToolStatus.SUCCESS)
        product.refresh_from_db()
        self.assertEqual(product.status, "archived")

    def test_archive_already_archived(self):
        product = Product.objects.create(
            business=self.business,
            name="Already Archived",
            status=Product.Status.ARCHIVED,
        )

        result = self.tool.execute(
            decision=self._decision(DecisionAction.MANAGE_PRODUCT),
            context=self.context,
            arguments={"operation": "archive", "product_id": product.pk},
        )
        self.assertEqual(result.status, ToolStatus.SUCCESS)

    def test_invalid_operation_fails(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.MANAGE_PRODUCT),
            context=self.context,
            arguments={"operation": "destroy"},
        )
        self.assertEqual(result.status, ToolStatus.FAILED)


class CreateLeadToolTests(RealToolTestBase):
    """CreateLeadTool must write real Lead records."""

    def setUp(self):
        super().setUp()
        self.tool = CreateLeadTool()

    def test_creates_lead_in_database(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.CREATE_LEAD),
            context=self.context,
            arguments={
                "source": "Instagram",
                "interest": "Looking for leather bags",
                "customer_name": "Jane Doe",
                "notes": "Very interested, asked about price.",
            },
        )

        self.assertEqual(result.status, ToolStatus.SUCCESS)
        lead = Lead.objects.get(pk=result.data["lead_id"])
        self.assertEqual(lead.business_id, self.business.id)
        self.assertEqual(lead.source, "instagram")
        self.assertEqual(lead.interest, "Looking for leather bags")
        self.assertEqual(lead.customer_name, "Jane Doe")
        self.assertEqual(lead.status, "new")
        self.assertTrue(lead.created_by_ai)

    def test_missing_source_fails(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.CREATE_LEAD),
            context=self.context,
            arguments={"interest": "Wants shoes"},
        )
        self.assertEqual(result.status, ToolStatus.FAILED)
        self.assertEqual(Lead.objects.filter(business=self.business).count(), 0)

    def test_missing_interest_fails(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.CREATE_LEAD),
            context=self.context,
            arguments={"source": "whatsapp"},
        )
        self.assertEqual(result.status, ToolStatus.FAILED)

    def test_empty_source_fails(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.CREATE_LEAD),
            context=self.context,
            arguments={"source": "   ", "interest": "Wants shoes"},
        )
        self.assertEqual(result.status, ToolStatus.FAILED)


class PublishContentToolTests(RealToolTestBase):
    """PublishContentTool must update Content status in the database."""

    def setUp(self):
        super().setUp()
        self.tool = PublishContentTool()

    def test_publishes_draft_content(self):
        content = Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="Test post",
            status=Content.Status.DRAFT,
        )

        result = self.tool.execute(
            decision=self._decision(DecisionAction.PUBLISH_CONTENT),
            context=self.context,
            arguments={"content_id": content.pk},
        )

        self.assertEqual(result.status, ToolStatus.SUCCESS)
        content.refresh_from_db()
        self.assertEqual(content.status, "published")
        self.assertIsNotNone(content.published_at)

    def test_publishes_approved_content(self):
        content = Content.objects.create(
            business=self.business,
            platform="facebook",
            content_type="post",
            caption="Approved post",
            status=Content.Status.APPROVED,
        )

        result = self.tool.execute(
            decision=self._decision(DecisionAction.PUBLISH_CONTENT),
            context=self.context,
            arguments={"content_id": content.pk},
        )

        self.assertEqual(result.status, ToolStatus.SUCCESS)
        content.refresh_from_db()
        self.assertEqual(content.status, "published")

    def test_rejected_content_cannot_be_published(self):
        content = Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="Rejected post",
            status=Content.Status.REJECTED,
        )

        result = self.tool.execute(
            decision=self._decision(DecisionAction.PUBLISH_CONTENT),
            context=self.context,
            arguments={"content_id": content.pk},
        )

        self.assertEqual(result.status, ToolStatus.FAILED)
        content.refresh_from_db()
        self.assertEqual(content.status, "rejected")

    def test_already_published_is_idempotent(self):
        content = Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="Already published",
            status=Content.Status.PUBLISHED,
        )

        result = self.tool.execute(
            decision=self._decision(DecisionAction.PUBLISH_CONTENT),
            context=self.context,
            arguments={"content_id": content.pk},
        )
        self.assertEqual(result.status, ToolStatus.SUCCESS)

    def test_nonexistent_content_fails(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.PUBLISH_CONTENT),
            context=self.context,
            arguments={"content_id": 99999},
        )
        self.assertEqual(result.status, ToolStatus.FAILED)

    def test_missing_content_id_fails(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.PUBLISH_CONTENT),
            context=self.context,
            arguments={},
        )
        self.assertEqual(result.status, ToolStatus.FAILED)


class ManageCommerceToolTests(RealToolTestBase):
    """ManageCommerceTool must read real commerce data."""

    def setUp(self):
        super().setUp()
        self.tool = ManageCommerceTool()

    def test_list_products(self):
        Product.objects.create(
            business=self.business, name="Shoe A", status=Product.Status.ACTIVE
        )
        Product.objects.create(
            business=self.business, name="Shoe B", status=Product.Status.DRAFT
        )
        Product.objects.create(
            business=self.business, name="Old Shoe", status=Product.Status.ARCHIVED
        )

        result = self.tool.execute(
            decision=self._decision(DecisionAction.MANAGE_COMMERCE),
            context=self.context,
            arguments={"operation": "list_products"},
        )

        self.assertEqual(result.status, ToolStatus.SUCCESS)
        self.assertEqual(len(result.data["products"]), 2)

    def test_get_product(self):
        product = Product.objects.create(
            business=self.business, name="Specific Shoe", price=Decimal("3000")
        )

        result = self.tool.execute(
            decision=self._decision(DecisionAction.MANAGE_COMMERCE),
            context=self.context,
            arguments={"operation": "get_product", "resource_id": product.pk},
        )

        self.assertEqual(result.status, ToolStatus.SUCCESS)
        self.assertEqual(result.data["product"]["name"], "Specific Shoe")
        self.assertEqual(result.data["product"]["price"], "3000.00")

    def test_get_commerce_page(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.MANAGE_COMMERCE),
            context=self.context,
            arguments={"operation": "get_commerce_page"},
        )

        # Provisioning creates a commerce page automatically
        self.assertEqual(result.status, ToolStatus.SUCCESS)
        self.assertIn("commerce_page", result.data)

    def test_get_sales_summary(self):
        Product.objects.create(
            business=self.business, name="P1", status=Product.Status.ACTIVE
        )
        Product.objects.create(
            business=self.business, name="P2", status=Product.Status.DRAFT
        )

        result = self.tool.execute(
            decision=self._decision(DecisionAction.MANAGE_COMMERCE),
            context=self.context,
            arguments={"operation": "get_sales_summary"},
        )

        self.assertEqual(result.status, ToolStatus.SUCCESS)
        self.assertEqual(result.data["total_products"], 2)
        self.assertEqual(result.data["active_products"], 1)
        self.assertEqual(result.data["draft_products"], 1)

    def test_invalid_operation_fails(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.MANAGE_COMMERCE),
            context=self.context,
            arguments={"operation": "drop_tables"},
        )
        self.assertEqual(result.status, ToolStatus.FAILED)


class GetAnalyticsToolTests(RealToolTestBase):
    """GetAnalyticsTool must query real data."""

    def setUp(self):
        super().setUp()
        self.tool = GetAnalyticsTool()

        Product.objects.create(
            business=self.business, name="P1", status=Product.Status.ACTIVE
        )
        Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="Test",
            status=Content.Status.PUBLISHED,
        )
        Lead.objects.create(
            business=self.business,
            source="instagram",
            interest="Wants shoes",
            status=Lead.Status.NEW,
        )

    def test_sales_analytics(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.GET_ANALYTICS),
            context=self.context,
            arguments={"metric": "sales"},
        )
        self.assertEqual(result.status, ToolStatus.SUCCESS)
        self.assertEqual(result.data["active_products"], 1)

    def test_leads_analytics(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.GET_ANALYTICS),
            context=self.context,
            arguments={"metric": "leads"},
        )
        self.assertEqual(result.status, ToolStatus.SUCCESS)
        self.assertEqual(result.data["new_leads"], 1)

    def test_content_analytics(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.GET_ANALYTICS),
            context=self.context,
            arguments={"metric": "content"},
        )
        self.assertEqual(result.status, ToolStatus.SUCCESS)
        self.assertEqual(result.data["published"], 1)

    def test_overview_analytics(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.GET_ANALYTICS),
            context=self.context,
            arguments={"metric": "overview"},
        )
        self.assertEqual(result.status, ToolStatus.SUCCESS)
        self.assertIn("products", result.data)
        self.assertIn("leads", result.data)
        self.assertIn("content", result.data)

    def test_invalid_metric_fails(self):
        result = self.tool.execute(
            decision=self._decision(DecisionAction.GET_ANALYTICS),
            context=self.context,
            arguments={"metric": "unicorns"},
        )
        self.assertEqual(result.status, ToolStatus.FAILED)
