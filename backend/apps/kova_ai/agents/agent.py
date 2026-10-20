"""
Production Kova Agent.

The agent coordinates:

    User request
        ↓
    LLM reasoning
        ↓
    Tool request
        ↓
    Decision
        ↓
    Permission Engine
        ↓
    Action Executor
        ↓
    Tool
        ↓
    Verification
        ↓
    Learning
        ↓
    Tool outcome returned to LLM
        ↓
    Final response

The LLM never directly executes application capabilities.
"""

from __future__ import annotations

import json
from typing import Any

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import (
    Decision,
    DecisionStatus,
)
from apps.kova_ai.execution.executor import ActionExecutor
from apps.kova_ai.execution.types import ExecutionResult
from apps.kova_ai.learning.learner import LearningEngine
from apps.kova_ai.learning.types import LearningResult
from apps.kova_ai.permissions.engine import PermissionEngine
from apps.kova_ai.tools.defaults import build_default_tool_registry
from apps.kova_ai.tools.registry import ToolRegistry
from apps.kova_ai.verification.verifier import ActionVerifier
from apps.kova_ai.verification.types import VerificationResult

from ..services.openrouter import OpenRouterService
from .prompts import KOVA_AGENT_SYSTEM_PROMPT
from .types import AgentResult, AgentToolCall


class KovaAgentError(Exception):
    """Raised when Kova cannot complete an agent run."""


class KovaAgent:
    """Production orchestration layer for Kova's AI agent."""

    def __init__(
        self,
        *,
        llm: OpenRouterService | None = None,
        tool_registry: ToolRegistry | None = None,
        permission_engine: PermissionEngine | None = None,
        action_executor: ActionExecutor | None = None,
        verifier: ActionVerifier | None = None,
        learner: LearningEngine | None = None,
        max_tool_rounds: int = 8,
    ) -> None:
        if max_tool_rounds < 1:
            raise ValueError(
                "max_tool_rounds must be at least 1."
            )

        self.llm = llm or OpenRouterService()

        self.tool_registry = (
            tool_registry or build_default_tool_registry()
        )

        self.permission_engine = (
            permission_engine or PermissionEngine()
        )

        self.action_executor = (
            action_executor
            or ActionExecutor(
                tool_registry=self.tool_registry,
                permission_engine=self.permission_engine,
            )
        )

        self.verifier = verifier or ActionVerifier()
        self.learner = learner or LearningEngine()

        self.max_tool_rounds = max_tool_rounds

    def run(
        self,
        *,
        context: BusinessContext,
        user_request: str,
    ) -> AgentResult:
        """
        Run Kova's reasoning and tool-calling loop.

        The loop is bounded to prevent runaway model/tool execution.
        """

        if not user_request.strip():
            raise ValueError(
                "user_request must not be empty."
            )

        messages: list[dict[str, Any]] = [
            {
                "role": "system",
                "content": KOVA_AGENT_SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": self._build_user_message(
                    context=context,
                    user_request=user_request,
                ),
            },
        ]

        tool_calls: list[AgentToolCall] = []

        for _ in range(self.max_tool_rounds):
            response = self.llm.chat(
                messages=messages,
                tools=self.tool_registry.definitions(),
                tool_choice="auto",
                parallel_tool_calls=False,
                temperature=0.2,
                max_tokens=4096,
                feature="ask_kova",
                business_id=(
                    context.business.get("id")
                    if isinstance(context.business, dict)
                    else None
                ),
            )

            message = self._extract_message(response)

            requested_tools = message.get(
                "tool_calls",
                [],
            )

            if not requested_tools:
                return AgentResult(
                    message=self._extract_text(message),
                    tool_calls=tuple(tool_calls),
                    model=response.get("model"),
                )

            messages.append(message)

            for tool_call in requested_tools:
                record = self._execute_tool_call(
                    tool_call=tool_call,
                    context=context,
                )

                tool_calls.append(record)

                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": record.tool_call_id,
                        "name": record.tool_name,
                        "content": self._tool_result_content(
                            record=record,
                        ),
                    }
                )

        raise KovaAgentError(
            "Kova reached the maximum number of tool rounds "
            "without producing a final response."
        )

    def _execute_tool_call(
        self,
        *,
        tool_call: dict[str, Any],
        context: BusinessContext,
    ) -> AgentToolCall:
        """
        Validate and execute one model-generated tool call.

        The model can request a tool, but the request is transformed
        into a Decision and passed through the application's controlled
        execution lifecycle.

        The lifecycle is:

            Tool request
                ↓
            Decision
                ↓
            Permission
                ↓
            Execution
                ↓
            Verification
                ↓
            Learning
        """

        tool_name, tool_call_id, arguments = (
            self._parse_tool_call(
                tool_call,
            )
        )

        try:
            tool = self.tool_registry.get(
                tool_name,
            )
        except KeyError as exc:
            raise KovaAgentError(
                f"Tool '{tool_name}' is not registered."
            ) from exc

        decision = Decision(
            action=tool.action,
            status=DecisionStatus.READY,
            reason=(
                f"Kova requested execution of the "
                f"'{tool_name}' tool."
            ),
            inputs=arguments,
        )

        execution_result = self.action_executor.execute(
            decision=decision,
            context=context,
            arguments=arguments,
        )

        verification_result = self.verifier.verify(
            decision=decision,
            context=context,
            execution_result=execution_result,
        )

        learning_result = self.learner.learn(
            decision=decision,
            context=context,
            verification=verification_result,
        )

        result = self._build_tool_result(
            execution=execution_result,
            verification=verification_result,
            learning=learning_result,
        )

        return AgentToolCall(
            tool_name=tool_name,
            tool_call_id=tool_call_id,
            arguments=arguments,
            result=result,
        )

    @staticmethod
    def _parse_tool_call(
        tool_call: dict[str, Any],
    ) -> tuple[str, str, dict[str, Any]]:
        """
        Validate and parse a model-generated tool call.

        Raises:
            KovaAgentError: If the model response does not contain a
                valid tool call.
        """

        try:
            function = tool_call["function"]
            tool_name = function["name"]
            raw_arguments = function.get(
                "arguments",
                "{}",
            )
            tool_call_id = tool_call["id"]
        except (KeyError, TypeError) as exc:
            raise KovaAgentError(
                "OpenRouter returned an invalid tool call."
            ) from exc

        if not isinstance(tool_name, str) or not tool_name.strip():
            raise KovaAgentError(
                "OpenRouter returned an invalid tool name."
            )

        if not isinstance(tool_call_id, str) or not tool_call_id.strip():
            raise KovaAgentError(
                "OpenRouter returned an invalid tool call ID."
            )

        if isinstance(raw_arguments, dict):
            arguments = raw_arguments
        else:
            try:
                arguments = json.loads(raw_arguments)
            except (
                TypeError,
                json.JSONDecodeError,
            ) as exc:
                raise KovaAgentError(
                    f"Tool '{tool_name}' returned invalid arguments."
                ) from exc

        if not isinstance(arguments, dict):
            raise KovaAgentError(
                f"Tool '{tool_name}' arguments must be an object."
            )

        return (
            tool_name,
            tool_call_id,
            arguments,
        )

    @staticmethod
    def _build_tool_result(
        *,
        execution: ExecutionResult,
        verification: VerificationResult,
        learning: LearningResult,
    ) -> dict[str, Any]:
        """
        Build the structured result returned to the model.

        The result contains execution, verification, and learning state
        so the model can accurately describe what happened without
        assuming that execution alone means success.
        """

        return {
            "status": (
                "success"
                if verification.verified
                else (
                    "failed"
                    if verification.failed
                    else "inconclusive"
                )
            ),
            "execution": {
                "status": execution.status,
                "message": execution.message,
                "data": execution.data,
            },
            "verification": {
                "status": verification.status,
                "message": verification.message,
                "evidence": verification.evidence,
            },
            "learning": {
                "type": learning.learning_type,
                "summary": learning.summary,
                "confidence": learning.confidence,
            },
        }

    @staticmethod
    def _tool_result_content(
        *,
        record: AgentToolCall,
    ) -> str:
        """
        Serialize a tool result for the next LLM turn.

        The model receives structured results from the actual execution,
        verification, and learning layers.
        """

        return json.dumps(
            {
                "tool": record.tool_name,
                **record.result,
            },
            default=str,
        )

    @staticmethod
    def _build_user_message(
        *,
        context: BusinessContext,
        user_request: str,
    ) -> str:
        """Provide the model with authoritative current context."""

        payload = {
            "user_request": user_request,
            "business_context": {
                "business": context.business,
                "profile": context.profile,
                "audience": context.audience,
                "brand": context.brand,
                "goals": context.goals,
                "policy": context.policy,
                "market": context.market,
                "task": context.task,
                "task_context": context.task_context,
            },
        }

        return json.dumps(
            payload,
            default=str,
        )

    @staticmethod
    def _extract_message(
        response: dict[str, Any],
    ) -> dict[str, Any]:
        """Extract the assistant message from an LLM response."""

        try:
            message = response["choices"][0]["message"]
        except (
            KeyError,
            IndexError,
            TypeError,
        ) as exc:
            raise KovaAgentError(
                "OpenRouter returned an invalid assistant message."
            ) from exc

        if not isinstance(message, dict):
            raise KovaAgentError(
                "OpenRouter returned an invalid assistant message."
            )

        return message

    @staticmethod
    def _extract_text(
        message: dict[str, Any],
    ) -> str:
        """Extract the final natural-language response."""

        content = message.get(
            "content",
            "",
        )

        if content is None:
            return ""

        if not isinstance(content, str):
            raise KovaAgentError(
                "Kova received an invalid final response."
            )

        return content.strip()