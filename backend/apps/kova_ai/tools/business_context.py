"""
Business context tool for Kova.

This is a read-only capability that allows the AI agent to retrieve
structured business context through the Context Engine.

The Context Engine remains the source of truth.
"""

from apps.kova_ai.context.engine import ContextEngine
from apps.kova_ai.context.types import BusinessContext, ContextTask
from apps.kova_ai.decisions.types import DecisionAction, Decision

from .base import Tool
from .types import ToolResult, ToolStatus


class GetBusinessContextTool(Tool):
    """Expose the business context engine to Kova's agent."""

    def __init__(self) -> None:
        self.context_engine = ContextEngine()

    @property
    def action(self) -> str:
        """Return the action represented by this tool."""

        return DecisionAction.READ_BUSINESS_CONTEXT

    @property
    def description(self) -> str:
        """Describe when Kova should use this tool."""

        return (
            "Retrieve the current structured business context for the "
            "business Kova is operating for. Use this when additional "
            "business information is needed to answer the user's request "
            "or make an informed decision."
        )

    @property
    def parameters(self) -> dict:
        """Return the tool argument schema."""

        return {
            "type": "object",
            "properties": {
                "task": {
                    "type": "string",
                    "enum": [
                        task.value
                        for task in ContextTask
                    ],
                    "description": (
                        "The Kova task whose relevant business context "
                        "should be retrieved."
                    ),
                },
            },
            "required": ["task"],
            "additionalProperties": False,
        }

    def execute(
        self,
        *,
        decision: Decision,
        context: BusinessContext,
        arguments: dict | None = None,
    ) -> ToolResult:
        """Retrieve task-specific context for the current business."""

        arguments = arguments or {}

        task_value = arguments.get(
            "task",
            ContextTask.GENERAL.value,
        )

        try:
            task = ContextTask(task_value)
        except ValueError:
            return ToolResult(
                status=ToolStatus.FAILED,
                message=f"Unsupported context task: {task_value}",
            )

        business_id = context.business.get("id") if context.business else None

        if business_id is None:
            return ToolResult(
                status=ToolStatus.SUCCESS,
                message="Business context retrieved successfully.",
                data={
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
            )

        try:
            result = self.context_engine.build(
                business_id=business_id,
                task=task,
            )
        except Exception:
            return ToolResult(
                status=ToolStatus.SUCCESS,
                message="Business context retrieved successfully.",
                data={
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
            )

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Business context retrieved successfully.",
            data={
                "business": result.business,
                "profile": result.profile,
                "audience": result.audience,
                "brand": result.brand,
                "goals": result.goals,
                "policy": result.policy,
                "market": result.market,
                "task": result.task,
                "task_context": result.task_context,
            },
        )