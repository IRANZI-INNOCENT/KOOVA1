"""
Types used by the Kova Learning layer.

Learning captures useful information from verified action outcomes.

Learning is intentionally separate from permanent business memory.
A learning result describes what Kova observed; a future memory layer
can decide whether that information should be persisted.
"""

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class LearningType(StrEnum):
    """Types of learning Kova can produce."""

    SUCCESS = "success"
    FAILURE = "failure"
    OBSERVATION = "observation"


@dataclass(frozen=True)
class LearningResult:
    """
    Structured learning produced from a verified action outcome.

    Learning does not modify business data or persistent memory.
    It only describes what was learned from the outcome.
    """

    learning_type: LearningType
    summary: str
    action: str
    evidence: dict[str, Any] = field(default_factory=dict)
    confidence: float = 1.0

    @property
    def is_success(self) -> bool:
        """Return whether the learning represents a successful outcome."""

        return self.learning_type == LearningType.SUCCESS

    @property
    def is_failure(self) -> bool:
        """Return whether the learning represents a failed outcome."""

        return self.learning_type == LearningType.FAILURE