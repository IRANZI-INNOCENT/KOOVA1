"""
Tests for the Kova Create Content Tool.

The tool now writes real Content records to the database.
"""

from django.test import TestCase

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.content.models import Content
from apps.kova_ai.context.types import BusinessContext, ContextTask
from apps.kova_ai.decisions.types import (
    Decision,
    DecisionAction,
    DecisionStatus,
)

from .create_content import CreateContentTool
from .types import ToolStatus


class CreateContentToolTests(TestCase):
    """Test content creation writes to the database."""

    def setUp(self):
        self.tool = CreateContentTool()

        self.user = User.objects.create_user(
            email="owner@tool-test.com",
            password="test-password",
            first_name="Test",
            last_name="Owner",
        )

        self.business = Business.objects.create(
            owner=self.user,
            name="Tool Test Business",
            description="Testing tools.",
            industry="Retail",
            location="Nairobi",
        )

        self.context = BusinessContext(
            business={
                "id": self.business.id,
                "name": self.business.name,
                "industry": self.business.industry,
            },
            profile=None,
            audience=None,
            brand=None,
            goals=None,
            policy={"allow_content_creation": True},
            task=ContextTask.CONTENT_CREATION,
        )

        self.decision = Decision(
            action=DecisionAction.CREATE_CONTENT,
            status=DecisionStatus.READY,
            reason="Create promotional content.",
        )

    def test_creates_content_in_database(self):
        """Valid arguments should create a real Content record."""

        result = self.tool.execute(
            decision=self.decision,
            context=self.context,
            arguments={
                "platform": "Instagram",
                "content_type": "post",
                "caption": "Fresh arrivals are here.",
                "call_to_action": "DM us to order.",
            },
        )

        self.assertEqual(result.status, ToolStatus.SUCCESS)
        self.assertIn("content_id", result.data)

        content = Content.objects.get(pk=result.data["content_id"])
        self.assertEqual(content.business_id, self.business.id)
        self.assertEqual(content.platform, "instagram")
        self.assertEqual(content.content_type, "post")
        self.assertEqual(content.caption, "Fresh arrivals are here.")
        self.assertEqual(content.call_to_action, "DM us to order.")
        self.assertEqual(content.status, "draft")
        self.assertTrue(content.created_by_ai)

    def test_business_identity_comes_from_context(self):
        """The tool must use the context business, not model args."""

        result = self.tool.execute(
            decision=self.decision,
            context=self.context,
            arguments={
                "platform": "Facebook",
                "content_type": "post",
                "caption": "Test content.",
                "business_id": 999,
            },
        )

        self.assertEqual(result.status, ToolStatus.SUCCESS)
        content = Content.objects.get(pk=result.data["content_id"])
        self.assertEqual(content.business_id, self.business.id)

    def test_missing_platform_fails(self):
        """Platform is required."""

        result = self.tool.execute(
            decision=self.decision,
            context=self.context,
            arguments={"content_type": "post", "caption": "Test."},
        )

        self.assertEqual(result.status, ToolStatus.FAILED)
        self.assertIn("platform", result.message.lower())
        self.assertEqual(Content.objects.filter(business=self.business).count(), 0)

    def test_missing_content_type_fails(self):
        """Content type is required."""

        result = self.tool.execute(
            decision=self.decision,
            context=self.context,
            arguments={"platform": "Instagram", "caption": "Test."},
        )

        self.assertEqual(result.status, ToolStatus.FAILED)
        self.assertEqual(Content.objects.filter(business=self.business).count(), 0)

    def test_missing_caption_fails(self):
        """Caption is required."""

        result = self.tool.execute(
            decision=self.decision,
            context=self.context,
            arguments={"platform": "Instagram", "content_type": "post"},
        )

        self.assertEqual(result.status, ToolStatus.FAILED)
        self.assertIn("caption", result.message.lower())

    def test_whitespace_is_trimmed(self):
        """String inputs should be normalized."""

        result = self.tool.execute(
            decision=self.decision,
            context=self.context,
            arguments={
                "platform": " Instagram ",
                "content_type": " post ",
                "caption": " Fresh arrivals. ",
            },
        )

        self.assertEqual(result.status, ToolStatus.SUCCESS)
        content = Content.objects.get(pk=result.data["content_id"])
        self.assertEqual(content.platform, "instagram")
        self.assertEqual(content.content_type, "post")
        self.assertEqual(content.caption, "Fresh arrivals.")

    def test_content_is_created_as_draft(self):
        """Creation must not imply publication."""

        result = self.tool.execute(
            decision=self.decision,
            context=self.context,
            arguments={
                "platform": "Instagram",
                "content_type": "post",
                "caption": "Fresh arrivals.",
            },
        )

        content = Content.objects.get(pk=result.data["content_id"])
        self.assertEqual(content.status, "draft")
        self.assertIsNone(content.published_at)
