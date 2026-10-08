"""
Types used by the Kova Action Execution layer.

Execution represents one attempt to run an authorized Kova decision.

Execution does not determine whether an action is appropriate or
permitted. Those responsibilities belong to the Decision Engine and
Permission Engine.
"""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class ExecutionStatus(StrEnum):
    """Lifecycle states for an action execution."""

    PENDING = "pending"
    EXECUTING = "executing"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


@dataclass(frozen=True)
class ExecutionResult:
    """
    Structured result of an action execution.

    Verification is intentionally separate. A successful execution
    means the tool completed successfully; it does not prove that
    an external system actually produced the intended outcome.
    """

    status: ExecutionStatus
    message: str
    tool_result: Any = None
    data: dict[str, Any] = field(default_factory=dict)

    @property
    def successful(self) -> bool:
        """Return whether execution completed successfully."""

        return self.status == ExecutionStatus.SUCCEEDED

    @property
    def failed(self) -> bool:
        """Return whether execution failed."""

        return self.status == ExecutionStatus.FAILED