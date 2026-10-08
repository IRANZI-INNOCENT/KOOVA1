"""
Kova AI Reasoner.

The AI Reasoner translates business context and a user/task request
into a structured proposed action.

The Reasoner does not:
    - execute tools
    - grant permissions
    - bypass policies
    - communicate with external business platforms
"""

import json
from typing import Any

from apps.kova_ai.context.types import BusinessContext

from ..services.openrouter import OpenRouterService
from .prompts import KOVA_REASONING_SYSTEM_PROMPT
from .types import AIReasoningResult


class AIReasoningError(Exception):
    """Raised when Kova cannot produce valid structured reasoning."""


class AIReasoner:
    """Generate structured reasoning using an LLM."""

    def __init__(
        self,
        *,
        llm: OpenRouterService | None = None,
    ) -> None:
        self.llm = llm or OpenRouterService()

    def reason(
        self,
        *,
        context: BusinessContext,
        user_request: str,
    ) -> AIReasoningResult:
        """
        Reason about a user request using business context.

        Args:
            context: Business context assembled by the Context Engine.
            user_request: The user's natural-language request.

        Returns:
            Structured AI reasoning.

        Raises:
            AIReasoningError: If the model response cannot be parsed
                into the required structure.
        """

        messages = [
            {
                "role": "system",
                "content": KOVA_REASONING_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": self._build_user_message(
                    context=context,
                    user_request=user_request,
                ),
            },
        ]

        response = self.llm.chat(
            messages=messages,
            temperature=0.2,
            response_format={
                "type": "json_object",
            },
        )

        content = self._extract_content(response)

        try:
            data = json.loads(content)
        except json.JSONDecodeError as exc:
            raise AIReasoningError(
                "Kova received an invalid JSON reasoning response."
            ) from exc

        return self._parse_result(
            data=data,
            raw_response=response,
        )

    @staticmethod
    def _build_user_message(
        *,
        context: BusinessContext,
        user_request: str,
    ) -> str:
        """Build the structured context sent to the model."""

        payload = {
            "user_request": user_request,
            "business_context": {
                "business": context.business,
                "profile": context.profile,
                "audience": context.audience,
                "brand": context.brand,
                "goals": context.goals,
                "policy": context.policy,
                "task": context.task,
                "task_context": context.task_context,
            },
        }

        return json.dumps(
            payload,
            default=str,
        )

    @staticmethod
    def _extract_content(
        response: dict[str, Any],
    ) -> str:
        """Extract the assistant message content."""

        try:
            return response["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise AIReasoningError(
                "OpenRouter returned an unexpected response structure."
            ) from exc

    @staticmethod
    def _parse_result(
        *,
        data: dict[str, Any],
        raw_response: dict[str, Any],
    ) -> AIReasoningResult:
        """Validate and construct the reasoning result."""

        required_fields = {
            "intent",
            "reasoning",
            "proposed_action",
            "inputs",
            "confidence",
        }

        missing_fields = required_fields - data.keys()

        if missing_fields:
            raise AIReasoningError(
                "Kova reasoning response is missing fields: "
                + ", ".join(sorted(missing_fields))
            )

        confidence = data["confidence"]

        if not isinstance(confidence, (int, float)):
            raise AIReasoningError(
                "Kova reasoning confidence must be numeric."
            )

        if not 0 <= confidence <= 1:
            raise AIReasoningError(
                "Kova reasoning confidence must be between 0 and 1."
            )

        if not isinstance(data["inputs"], dict):
            raise AIReasoningError(
                "Kova reasoning inputs must be an object."
            )

        return AIReasoningResult(
            intent=str(data["intent"]),
            reasoning=str(data["reasoning"]),
            proposed_action=str(data["proposed_action"]),
            inputs=data["inputs"],
            confidence=float(confidence),
            raw_response=raw_response,
        )