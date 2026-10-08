"""
Tests for the Kova Agent API.
"""

from unittest.mock import patch

from django.test import TestCase

from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.kova_ai.agents.types import AgentResult
from apps.kova_ai.agents.types import AgentResult, AgentToolCall


class KovaAgentAPITests(TestCase):
    """Test the authenticated Kova Agent API."""

    def setUp(self):
        self.client = APIClient()

        self.user = User.objects.create_user(
            email="owner@example.com",
            password="test-password",
            first_name="Test",
            last_name="Owner",
        )

        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="test-password",
            first_name="Other",
            last_name="Owner",
        )

        self.business = Business.objects.create(
            owner=self.user,
            name="Test Business",
            description="A test business.",
            industry="Retail",
            location="Nairobi",
        )

        self.other_business = Business.objects.create(
            owner=self.other_user,
            name="Other Business",
        )

        self.url = "/api/kova/agent/"

    def authenticate(self):
        """Authenticate the API client."""

        self.client.force_authenticate(
            user=self.user,
        )

    @patch(
        "apps.kova_ai.api.views.KovaAgent.run",
    )
    def test_authenticated_owner_can_use_kova(
        self,
        mock_run,
    ):
        """A business owner should be able to invoke Kova."""

        self.authenticate()

        mock_run.return_value = AgentResult(
            message="Your primary goal is growth.",
            model="google/gemini-3.8-flash",
        )

        response = self.client.post(
            self.url,
            {
                "business_id": self.business.id,
                "message": "What is my business trying to achieve?",
                "task": "general",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertEqual(
            response.data["message"],
            "Your primary goal is growth.",
        )

        mock_run.assert_called_once()

    def test_unauthenticated_user_is_rejected(self):
        """Unauthenticated requests must not invoke Kova."""

        response = self.client.post(
            self.url,
            {
                "business_id": self.business.id,
                "message": "Help me.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            401,
        )

    @patch(
        "apps.kova_ai.api.views.KovaAgent.run",
    )
    def test_user_cannot_access_another_business(
        self,
        mock_run,
    ):
        """Business ownership must be enforced."""

        self.authenticate()

        response = self.client.post(
            self.url,
            {
                "business_id": self.other_business.id,
                "message": "Tell me about this business.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            404,
        )

        mock_run.assert_not_called()

    @patch(
        "apps.kova_ai.api.views.KovaAgent.run",
    )
    def test_empty_message_is_rejected(
        self,
        mock_run,
    ):
        """Empty messages must fail validation."""

        self.authenticate()

        response = self.client.post(
            self.url,
            {
                "business_id": self.business.id,
                "message": "",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        mock_run.assert_not_called()

    @patch(
        "apps.kova_ai.api.views.KovaAgent.run",
    )
    def test_invalid_task_is_rejected(
        self,
        mock_run,
    ):
        """Unknown Kova tasks must fail validation."""

        self.authenticate()

        response = self.client.post(
            self.url,
            {
                "business_id": self.business.id,
                "message": "Help me.",
                "task": "unknown_task",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

        mock_run.assert_not_called()

    @patch(
        "apps.kova_ai.api.views.KovaAgent.run",
    )
    def test_missing_business_is_rejected(
        self,
        mock_run,
    ):
        """A nonexistent business must not reach the agent."""

        self.authenticate()

        response = self.client.post(
            self.url,
            {
                "business_id": 999999,
                "message": "Help me.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            404,
        )

        mock_run.assert_not_called()

    @patch(
        "apps.kova_ai.api.views.KovaAgent.run",
    )
    def test_tool_calls_are_summarized_in_response(
        self,
        mock_run,
    ):
        """Internal tool details should not leak through the API."""

        self.authenticate()

        mock_run.return_value = AgentResult(
            message="I checked your business context.",
            model="google/gemini-3.8-flash",
        )

        response = self.client.post(
            self.url,
            {
                "business_id": self.business.id,
                "message": "Check my business.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            200,
        )

        self.assertNotIn(
            "business_context",
            response.data,
        )

    @patch(
        "apps.kova_ai.api.views.KovaAgent.run",
    )
    def test_agent_provider_failure_returns_503(
        self,
        mock_run,
    ):
        """Provider failures should return a service-unavailable response."""

        from apps.kova_ai.services.openrouter import OpenRouterError

        self.authenticate()

        mock_run.side_effect = OpenRouterError(
            "Provider unavailable.",
        )

        response = self.client.post(
            self.url,
            {
                "business_id": self.business.id,
                "message": "Help me.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            503,
        )

    @patch(
        "apps.kova_ai.api.views.KovaAgent.run",
    )
    def test_agent_failure_returns_502(
        self,
        mock_run,
    ):
        """Agent execution failures should return a gateway error."""

        from apps.kova_ai.agents.agent import KovaAgentError

        self.authenticate()

        mock_run.side_effect = KovaAgentError(
            "Agent failed.",
        )

        response = self.client.post(
            self.url,
            {
                "business_id": self.business.id,
                "message": "Help me.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            502,
        )