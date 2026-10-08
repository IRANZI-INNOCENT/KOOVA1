"""
Types used by the Kova Agent.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class AgentToolCall:
    """Record of one model-requested tool execution."""

    tool_name: str
    tool_call_id: str
    arguments: dict[str, Any]
    result: dict[str, Any]


@dataclass(frozen=True)
class AgentResult:
    """Final result returned by a Kova agent run."""

    message: str
    tool_calls: tuple[AgentToolCall, ...] = field(
        default_factory=tuple,
    )
    model: str | None = None