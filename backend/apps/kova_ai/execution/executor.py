"""
Kova Action Executor.

The Action Executor coordinates the execution of a Decision through the
Tool Registry.

Its responsibility is execution lifecycle only.

It does not:
    - decide what Kova should do
    - determine business policy
    - verify external outcomes
    - call an AI model

Permission enforcement remains part of the controlled execution path.
"""

from __future__ import annotations

from typing import Any

from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision
from apps.kova_ai.permissions.engine import PermissionEngine
from apps.kova_ai.tools.registry import ToolRegistry
from apps.kova_ai.tools.types import ToolStatus

from .types import ExecutionResult, ExecutionStatus


class ActionExecutor:
    """Execute Kova decisions through registered tools."""

    def __init__(
        self,
        *,
        tool_registry: ToolRegistry,
        permission_engine: PermissionEngine,
    ) -> None:
        self.tool_registry = tool_registry
        self.permission_engine = permission_engine

    def execute(
        self,
        *,
        decision: Decision,
        context: BusinessContext,
        arguments: dict[str, Any] | None = None,
    ) -> ExecutionResult:
        """
        Execute a decision through the controlled tool path.

        Permission is checked before the tool is allowed to execute.

        Args:
            decision: The decision describing the requested action.
            context: Current authoritative business context.
            arguments: Arguments supplied to the selected tool.

        Returns:
            ExecutionResult describing the execution outcome.
        """

        try:
            tool_result = self.tool_registry.execute(
                decision=decision,
                context=context,
                permission_engine=self.permission_engine,
                arguments=arguments or {},
            )
        except PermissionError as exc:
            return ExecutionResult(
                status=ExecutionStatus.FAILED,
                message=str(exc),
            )
        except KeyError as exc:
            return ExecutionResult(
                status=ExecutionStatus.FAILED,
                message=str(exc),
            )
        except Exception as exc:
            return ExecutionResult(
                status=ExecutionStatus.FAILED,
                message=f"Tool execution failed: {exc}",
            )

        if tool_result.status == ToolStatus.SUCCESS:
            return ExecutionResult(
                status=ExecutionStatus.SUCCEEDED,
                message=tool_result.message,
                tool_result=tool_result,
                data=tool_result.data,
            )

        return ExecutionResult(
            status=ExecutionStatus.FAILED,
            message=tool_result.message,
            tool_result=tool_result,
            data=tool_result.data,
        )