"""
Base contract for Kova tools.

A Kova tool is a controlled capability exposed to the AI reasoning
system.

The LLM may request a tool, but it never executes the tool itself.

The application:
    1. receives the model's request;
    2. resolves the registered tool;
    3. constructs a Kova decision;
    4. checks permission;
    5. executes the tool;
    6. returns the result to the model.
"""

from abc import ABC, abstractmethod
from typing import Any

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision

from .types import ToolResult


class Tool(ABC):
    """Base class for every Kova executable capability."""

    @property
    @abstractmethod
    def action(self) -> str:
        """Return the Kova action represented by this tool."""

        raise NotImplementedError

    @property
    def name(self) -> str:
        """Return the model-facing tool name."""

        return self.action

    @property
    def description(self) -> str:
        """Return a description that helps the model use the tool."""

        return f"Execute the {self.action} Kova capability."

    @property
    def parameters(self) -> dict[str, Any]:
        """
        Return the JSON Schema for tool arguments.

        Tools without arguments use an empty object schema.
        """

        return {
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False,
        }

    def definition(self) -> dict[str, Any]:
        """Return the OpenRouter-compatible function definition."""

        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }

    @abstractmethod
    def execute(
        self,
        *,
        decision: Decision,
        context: BusinessContext,
        arguments: dict[str, Any] | None = None,
    ) -> ToolResult:
        """Execute the capability."""

        raise NotImplementedError

    