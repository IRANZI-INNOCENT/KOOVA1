"""
Types used by the Kova Verification layer.

Verification determines whether there is sufficient evidence that
an executed action achieved its intended outcome.

Execution and verification are intentionally separate:

    Execution = the tool completed its attempt.
    Verification = the intended outcome was confirmed.
"""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class VerificationStatus(StrEnum):
    """Possible outcomes of action verification."""

    VERIFIED = "verified"
    FAILED = "failed"
    INCONCLUSIVE = "inconclusive"


@dataclass(frozen=True)
class VerificationResult:
    """
    Result of verifying an executed action.

    A successful execution does not automatically become a verified
    outcome. Verification requires explicit evidence.
    """

    status: VerificationStatus
    message: str
    evidence: dict[str, Any] = field(default_factory=dict)

    @property
    def verified(self) -> bool:
        """Return whether the action outcome was verified."""

        return self.status == VerificationStatus.VERIFIED

    @property
    def failed(self) -> bool:
        """Return whether verification established failure."""

        return self.status == VerificationStatus.FAILED

    @property
    def inconclusive(self) -> bool:
        """Return whether verification could not establish an outcome."""

        return self.status == VerificationStatus.INCONCLUSIVE