"""
Tool registry for Kova.

The registry owns the set of tools available to Kova and provides the
controlled path for resolving and executing those tools.
"""

from __future__ import annotations

import json
from typing import Any

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import (
    Decision,
    DecisionStatus,
)
from apps.kova_ai.permissions.engine import PermissionEngine

from .base import Tool
from .types import ToolResult


class ToolRegistry:
    """
    Registry of tools available to Kova.

    Tools are registered explicitly so that the agent can only request
    capabilities that the application has intentionally exposed.
    """

    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        """
        Register a tool.

        Raises:
            ValueError: If another tool already uses the same name.
        """

        if tool.name in self._tools:
            raise ValueError(
                f"A tool named '{tool.name}' is already registered."
            )

        self._tools[tool.name] = tool

    def get(self, name: str) -> Tool:
        """
        Return a registered tool by name.

        Raises:
            KeyError: If the requested tool is not registered.
        """

        try:
            return self._tools[name]
        except KeyError as exc:
            raise KeyError(
                f"No Kova tool is registered with the name '{name}'."
            ) from exc

    def has(self, name: str) -> bool:
        """Return whether a tool is registered under the given name."""

        return name in self._tools

    def actions(self) -> list[str]:
        """
        Return the action names currently registered with Kova.

        This provides a lightweight view of the registry for diagnostics,
        tests, and internal orchestration without exposing tool definitions.
        """

        return [tool.action for tool in self._tools.values()]

    def definitions(self) -> list[dict[str, Any]]:
        """
        Return OpenAI-compatible definitions for all registered tools.
        """

        return [
            tool.definition()
            for tool in self._tools.values()
        ]

    def execute(
        self,
        *,
        decision: Decision,
        context: BusinessContext,
        permission_engine: PermissionEngine,
        arguments: dict[str, Any] | None = None,
    ) -> ToolResult:
        """
        Execute the tool associated with a decision.

        Permission is checked before the tool is allowed to execute.

        Raises:
            PermissionError: If the decision is not allowed.
            KeyError: If no tool exists for the requested action.
        """

        permission = permission_engine.check(
            decision=decision,
            context=context,
        )

        if not permission.allowed:
            raise PermissionError(
                permission.reason,
            )

        tool = self._get_tool_for_action(
            action=decision.action,
        )

        return tool.execute(
            decision=decision,
            context=context,
            arguments=arguments or {},
        )

    def execute_tool_call(
        self,
        *,
        tool_name: str,
        arguments: dict[str, Any],
        context: BusinessContext,
        permission_engine: PermissionEngine,
    ) -> ToolResult:
        """
        Execute a tool requested by the model.

        The model supplies the tool name and arguments. The application
        resolves the registered tool, constructs a decision, and then
        passes that decision through the permission engine before execution.
        """

        tool = self.get(tool_name)

        decision = Decision(
            action=tool.action,
            status=DecisionStatus.READY,
            reason=(
                f"Kova requested tool execution for '{tool_name}'."
            ),
            inputs=arguments,
        )

        return self.execute(
            decision=decision,
            context=context,
            permission_engine=permission_engine,
            arguments=arguments,
        )

    @staticmethod
    def serialize_result(result: ToolResult) -> str:
        """
        Serialize a tool result for transmission back to the model.
        """

        return json.dumps(
            {
                "status": result.status,
                "message": result.message,
                "data": result.data,
            },
            default=str,
        )

    def _get_tool_for_action(self, *, action: str) -> Tool:
        """
        Resolve a registered tool by its action.

        Raises:
            KeyError: If no registered tool supports the action.
        """

        for tool in self._tools.values():
            if tool.action == action:
                return tool

        raise KeyError(
            f"No tool is registered for action '{action}'."
        )