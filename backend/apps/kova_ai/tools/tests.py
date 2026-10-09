"""
Tests for the Kova Tool Registry.
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

from .base import Tool
from .registry import ToolRegistry
from .types import ToolResult, ToolStatus


class FakeContentTool(Tool):
    """Fake content tool used to test registry execution."""

    @property
    def action(self) -> str:
        """Return the content creation action."""

        return DecisionAction.CREATE_CONTENT

    @property
    def description(self) -> str:
        """Return the tool description."""

        return "Create content for the business."

    def execute(
        self,
        *,
        decision,
        context,
        arguments=None,
    ) -> ToolResult:
        """Return a successful content result."""

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Content created.",
            data={
                "content": "Test content.",
            },
        )


class FakeCustomerResponseTool(Tool):
    """Fake customer response tool used to test registry execution."""

    @property
    def action(self) -> str:
        """Return the customer response action."""

        return DecisionAction.RESPOND_TO_CUSTOMER

    @property
    def description(self) -> str:
        """Return the customer response description."""

        return "Respond to a customer."

    def execute(
        self,
        *,
        decision,
        context,
        arguments=None,
    ) -> ToolResult:
        """Return a successful customer response result."""

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Customer response created.",
            data={
                "response": "Thank you for contacting us.",
            },
        )


class FakeCommerceTool(Tool):
    """Fake commerce tool used to test registry execution."""

    @property
    def action(self) -> str:
        """Return the commerce action."""

        return DecisionAction.MANAGE_COMMERCE

    @property
    def description(self) -> str:
        """Return the commerce description."""

        return "Manage business commerce."

    def execute(
        self,
        *,
        decision,
        context,
        arguments=None,
    ) -> ToolResult:
        """Return a successful commerce result."""

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Commerce action completed.",
            data={
                "commerce_action": decision.inputs.get("commerce_action"),
            },
        )


class FakeReadBusinessContextTool(Tool):
    """Fake business-context tool used to test read permissions."""

    @property
    def action(self) -> str:
        """Return the business-context read action."""

        return DecisionAction.READ_BUSINESS_CONTEXT

    @property
    def description(self) -> str:
        """Return the business-context description."""

        return "Read business context."

    def execute(
        self,
        *,
        decision,
        context,
        arguments=None,
    ) -> ToolResult:
        """Return a successful business-context result."""

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Business context retrieved.",
            data={
                "business_id": context.business["id"],
            },
        )


class ToolRegistryTests(TestCase):
    """Test registration, lookup, definitions, permissions, and execution."""

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

    def build_context(self, task=ContextTask.GENERAL):
        """Build business context for a test task."""

        return self.context_engine.build(
            business_id=self.business.id,
            task=task,
        )

    def test_registers_tool(self):
        """A tool can be registered and retrieved."""

        tool = FakeContentTool()

        self.registry.register(tool)

        self.assertTrue(
            self.registry.has(tool.name),
        )
        self.assertIs(
            self.registry.get(tool.name),
            tool,
        )

    def test_duplicate_tool_registration_is_rejected(self):
        """Duplicate tool names should not overwrite existing tools."""

        self.registry.register(
            FakeContentTool(),
        )

        with self.assertRaises(ValueError):
            self.registry.register(
                FakeContentTool(),
            )

    def test_missing_tool_raises_key_error(self):
        """Looking up an unknown tool should raise KeyError."""

        with self.assertRaises(KeyError):
            self.registry.get("does_not_exist")

    def test_actions_returns_registered_actions(self):
        """Registry should expose its registered actions."""

        content_tool = FakeContentTool()
        customer_tool = FakeCustomerResponseTool()

        self.registry.register(content_tool)
        self.registry.register(customer_tool)

        self.assertEqual(
            set(self.registry.actions()),
            {
                DecisionAction.CREATE_CONTENT,
                DecisionAction.RESPOND_TO_CUSTOMER,
            },
        )

    def test_definitions_returns_registered_tool_definitions(self):
        """Registry should expose OpenAI-compatible tool definitions."""

        self.registry.register(
            FakeContentTool(),
        )

        definitions = self.registry.definitions()

        self.assertEqual(
            len(definitions),
            1,
        )

        definition = definitions[0]

        self.assertEqual(
            definition["type"],
            "function",
        )
        self.assertEqual(
            definition["function"]["name"],
            DecisionAction.CREATE_CONTENT,
        )
        self.assertIn(
            "description",
            definition["function"],
        )
        self.assertIn(
            "parameters",
            definition["function"],
        )

    def test_executes_allowed_tool(self):
        """An allowed decision should reach its registered tool."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(allow_content_creation=True)

        self.registry.register(
            FakeContentTool(),
        )

        decision = Decision(
            action=DecisionAction.CREATE_CONTENT,
            status=DecisionStatus.READY,
            reason="Create content.",
        )

        result = self.registry.execute(
            decision=decision,
            context=self.build_context(
                ContextTask.CONTENT_CREATION,
            ),
            permission_engine=self.permission_engine,
        )

        self.assertEqual(
            result.status,
            ToolStatus.SUCCESS,
        )
        self.assertEqual(
            result.message,
            "Content created.",
        )

    def test_denied_tool_does_not_execute(self):
        """A denied decision must not reach the tool."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(allow_content_creation=False)

        self.registry.register(
            FakeContentTool(),
        )

        decision = Decision(
            action=DecisionAction.CREATE_CONTENT,
            status=DecisionStatus.READY,
            reason="Create content.",
        )

        with self.assertRaises(PermissionError):
            self.registry.execute(
                decision=decision,
                context=self.build_context(
                    ContextTask.CONTENT_CREATION,
                ),
                permission_engine=self.permission_engine,
            )

    def test_customer_response_tool_can_execute(self):
        """Customer response tools should use the same execution path."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(allow_comment_replies=True)

        self.registry.register(
            FakeCustomerResponseTool(),
        )

        decision = Decision(
            action=DecisionAction.RESPOND_TO_CUSTOMER,
            status=DecisionStatus.READY,
            reason="Reply to customer comment.",
            inputs={
                "channel": "comment",
            },
        )

        result = self.registry.execute(
            decision=decision,
            context=self.build_context(),
            permission_engine=self.permission_engine,
        )

        self.assertEqual(
            result.status,
            ToolStatus.SUCCESS,
        )
        self.assertEqual(
            result.message,
            "Customer response created.",
        )

    def test_commerce_tool_can_execute(self):
        """Commerce tools should use the same execution path."""

        BusinessPolicy.objects.filter(
            business=self.business,
        ).update(allow_product_management=True)

        self.registry.register(
            FakeCommerceTool(),
        )

        decision = Decision(
            action=DecisionAction.MANAGE_COMMERCE,
            status=DecisionStatus.READY,
            reason="Manage product.",
            inputs={
                "commerce_action": "product",
            },
        )

        result = self.registry.execute(
            decision=decision,
            context=self.build_context(
                ContextTask.COMMERCE,
            ),
            permission_engine=self.permission_engine,
        )

        self.assertEqual(
            result.status,
            ToolStatus.SUCCESS,
        )
        self.assertEqual(
            result.message,
            "Commerce action completed.",
        )

    def test_business_context_tool_can_execute(self):
        """Business context tools should be allowed to read context."""

        self.registry.register(
            FakeReadBusinessContextTool(),
        )

        decision = Decision(
            action=DecisionAction.READ_BUSINESS_CONTEXT,
            status=DecisionStatus.READY,
            reason="Read business context.",
        )

        result = self.registry.execute(
            decision=decision,
            context=self.build_context(),
            permission_engine=self.permission_engine,
        )

        self.assertEqual(
            result.status,
            ToolStatus.SUCCESS,
        )
        self.assertEqual(
            result.message,
            "Business context retrieved.",
        )

    def test_execute_tool_call_creates_decision(self):
        """Tool-call execution should create a controlled decision."""

        self.registry.register(
            FakeReadBusinessContextTool(),
        )

        result = self.registry.execute_tool_call(
            tool_name="get_business_context",
            arguments={
                "task": "general",
            },
            context=self.build_context(),
            permission_engine=self.permission_engine,
        )

        self.assertEqual(
            result.status,
            ToolStatus.SUCCESS,
        )
        self.assertEqual(
            result.message,
            "Business context retrieved.",
        )