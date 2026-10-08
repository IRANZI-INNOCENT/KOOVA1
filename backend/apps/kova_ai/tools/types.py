"""
Types used by the Kova Tool System.

Tools perform actions requested by the Decision Engine after the
Permission Engine has authorized those actions.

Tool results describe what happened. They do not make decisions.
"""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class ToolStatus(StrEnum):
    """Possible outcomes of tool execution."""

    SUCCESS = "success"
    FAILED = "failed"


@dataclass(frozen=True)
class ToolResult:
    """
    Result returned after a tool attempts an action.

    The result is intentionally generic so that future tools can return
    structured data without changing the core Tool System.
    """

    status: ToolStatus
    message: str
    data: dict[str, Any] = field(default_factory=dict)

    @property
    def successful(self) -> bool:
        """Return whether the tool completed successfully."""

        return self.status == ToolStatus.SUCCESS

    @property
    def failed(self) -> bool:
        """Return whether the tool execution failed."""

        return self.status == ToolStatus.FAILED