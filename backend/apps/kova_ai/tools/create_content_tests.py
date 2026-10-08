"""
Tests for the Kova Create Content Tool.
"""

from django.test import SimpleTestCase

from apps.kova_ai.context.types import (
    BusinessContext,
    ContextTask,
)
from apps.kova_ai.decisions.types import (
    Decision,
    DecisionAction,
    DecisionStatus,
)

from .create_content import CreateContentTool
from .types import ToolStatus


class CreateContentToolTests(SimpleTestCase):
    """Test content creation behavior."""

    def setUp(self):
        self.tool = CreateContentTool()

        self.context = BusinessContext(
            business={
                "id": 1,
                "name": "Test Business",
                "industry": "Retail",
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
            reason="Create promotional content.",
        )

    def test_creates_content_successfully(self):
        """Valid content arguments should produce a draft."""

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

        self.assertEqual(
            result.status,
            ToolStatus.SUCCESS,
        )

        content = result.data["content"]

        self.assertEqual(
            content["business_id"],
            1,
        )

        self.assertEqual(
            content["business_name"],
            "Test Business",
        )

        self.assertEqual(
            content["platform"],
            "Instagram",
        )

        self.assertEqual(
            content["content_type"],
            "post",
        )

        self.assertEqual(
            content["caption"],
            "Fresh arrivals are here.",
        )

        self.assertEqual(
            content["call_to_action"],
            "DM us to order.",
        )

        self.assertEqual(
            content["status"],
            "draft",
        )

    def test_business_identity_comes_from_context(self):
        """The tool must not accept business identity from the model."""

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

        self.assertEqual(
            result.status,
            ToolStatus.SUCCESS,
        )

        self.assertEqual(
            result.data["content"]["business_id"],
            1,
        )

    def test_missing_platform_fails(self):
        """Platform is required."""

        result = self.tool.execute(
            decision=self.decision,
            context=self.context,
            arguments={
                "content_type": "post",
                "caption": "Test content.",
            },
        )

        self.assertEqual(
            result.status,
            ToolStatus.FAILED,
        )

        self.assertIn(
            "platform",
            result.message.lower(),
        )

    def test_missing_content_type_fails(self):
        """Content type is required."""

        result = self.tool.execute(
            decision=self.decision,
            context=self.context,
            arguments={
                "platform": "Instagram",
                "caption": "Test content.",
            },
        )

        self.assertEqual(
            result.status,
            ToolStatus.FAILED,
        )

        self.assertIn(
            "content type",
            result.message.lower(),
        )

    def test_missing_caption_fails(self):
        """Caption is required."""

        result = self.tool.execute(
            decision=self.decision,
            context=self.context,
            arguments={
                "platform": "Instagram",
                "content_type": "post",
            },
        )

        self.assertEqual(
            result.status,
            ToolStatus.FAILED,
        )

        self.assertIn(
            "caption",
            result.message.lower(),
        )

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

        self.assertEqual(
            result.status,
            ToolStatus.SUCCESS,
        )

        content = result.data["content"]

        self.assertEqual(
            content["platform"],
            "Instagram",
        )

        self.assertEqual(
            content["content_type"],
            "post",
        )

        self.assertEqual(
            content["caption"],
            "Fresh arrivals.",
        )

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

        self.assertEqual(
            result.data["content"]["status"],
            "draft",
        )