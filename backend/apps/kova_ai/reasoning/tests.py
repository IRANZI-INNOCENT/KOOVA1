"""
Tests for Kova's AI Reasoning layer.
"""

import json

from django.test import SimpleTestCase

from apps.kova_ai.context.types import BusinessContext, ContextTask

from .reasoner import AIReasoningError, AIReasoner


class FakeLLM:
    """Fake LLM service used for deterministic tests."""

    def __init__(self, response):
        self.response = response
        self.calls = []

    def chat(self, **kwargs):
        """Record the request and return the configured response."""

        self.calls.append(kwargs)
        return self.response


class AIReasonerTests(SimpleTestCase):
    """Test structured AI reasoning."""

    def setUp(self):
        self.context = BusinessContext(
            business={
                "id": 1,
                "name": "Test Business",
            },
            profile={
                "description": "A retail business.",
            },
            audience={
                "primary_audience": "Young adults.",
            },
            brand={
                "voice": "Friendly and helpful.",
            },
            goals={
                "primary_goal": "Increase product awareness.",
            },
            policy={
                "allow_content_creation": True,
            },
            task=ContextTask.CONTENT_CREATION,
        )

    def test_valid_llm_response_produces_reasoning_result(self):
        """A valid model response should produce structured reasoning."""

        llm = FakeLLM(
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "intent": "Promote a product.",
                                    "reasoning": (
                                        "The business wants to increase "
                                        "product awareness."
                                    ),
                                    "proposed_action": "create_content",
                                    "inputs": {
                                        "platform": "instagram",
                                        "content_type": "post",
                                    },
                                    "confidence": 0.94,
                                }
                            )
                        }
                    }
                ]
            }
        )

        reasoner = AIReasoner(llm=llm)

        result = reasoner.reason(
            context=self.context,
            user_request="Create a post promoting my product.",
        )

        self.assertEqual(
            result.intent,
            "Promote a product.",
        )
        self.assertEqual(
            result.proposed_action,
            "create_content",
        )
        self.assertEqual(
            result.inputs["platform"],
            "instagram",
        )
        self.assertEqual(
            result.confidence,
            0.94,
        )

    def test_reasoner_sends_business_context_to_llm(self):
        """Business context must be included in the model request."""

        llm = FakeLLM(
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "intent": "Create content.",
                                    "reasoning": "Content is useful.",
                                    "proposed_action": "create_content",
                                    "inputs": {},
                                    "confidence": 0.9,
                                }
                            )
                        }
                    }
                ]
            }
        )

        reasoner = AIReasoner(llm=llm)

        reasoner.reason(
            context=self.context,
            user_request="Create content.",
        )

        request = llm.calls[0]

        user_message = request["messages"][1]["content"]

        self.assertIn(
            "Test Business",
            user_message,
        )
        self.assertIn(
            "Young adults",
            user_message,
        )
        self.assertIn(
            "Increase product awareness",
            user_message,
        )

    def test_invalid_json_is_rejected(self):
        """Invalid model JSON should raise a reasoning error."""

        llm = FakeLLM(
            {
                "choices": [
                    {
                        "message": {
                            "content": "not valid json",
                        }
                    }
                ]
            }
        )

        reasoner = AIReasoner(llm=llm)

        with self.assertRaises(AIReasoningError):
            reasoner.reason(
                context=self.context,
                user_request="Create content.",
            )

    def test_missing_field_is_rejected(self):
        """Incomplete structured model output should be rejected."""

        llm = FakeLLM(
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "intent": "Create content.",
                                    "reasoning": "Useful.",
                                }
                            )
                        }
                    }
                ]
            }
        )

        reasoner = AIReasoner(llm=llm)

        with self.assertRaises(AIReasoningError):
            reasoner.reason(
                context=self.context,
                user_request="Create content.",
            )

    def test_invalid_confidence_is_rejected(self):
        """Confidence outside the valid range must be rejected."""

        llm = FakeLLM(
            {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "intent": "Create content.",
                                    "reasoning": "Useful.",
                                    "proposed_action": "create_content",
                                    "inputs": {},
                                    "confidence": 2.0,
                                }
                            )
                        }
                    }
                ]
            }
        )

        reasoner = AIReasoner(llm=llm)

        with self.assertRaises(AIReasoningError):
            reasoner.reason(
                context=self.context,
                user_request="Create content.",
            )