"""
Types used by the Kova Permission Engine.

The Permission Engine determines whether a Decision may proceed,
requires owner approval, or must be denied.

It does not execute actions.
"""

from dataclasses import dataclass
from enum import StrEnum


class PermissionStatus(StrEnum):
    """Possible outcomes of a permission check."""

    ALLOWED = "allowed"
    REQUIRES_APPROVAL = "requires_approval"
    DENIED = "denied"


@dataclass(frozen=True)
class PermissionResult:
    """
    Result of evaluating whether Kova may perform a decision.

    The result describes authorization only. It does not execute
    the requested action.
    """

    status: PermissionStatus
    reason: str

    @property
    def allowed(self) -> bool:
        """Return whether the action may proceed immediately."""

        return self.status == PermissionStatus.ALLOWED

    @property
    def requires_approval(self) -> bool:
        """Return whether owner approval is required."""

        return self.status == PermissionStatus.REQUIRES_APPROVAL

    @property
    def denied(self) -> bool:
        """Return whether the action is explicitly denied."""

        return self.status == PermissionStatus.DENIED