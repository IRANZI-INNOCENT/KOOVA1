"""
Types used by Kova's AI Reasoning layer.

The LLM does not directly execute actions.

It produces a structured reasoning result that Kova's deterministic
control layers can inspect before anything is executed.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class AIReasoningResult:
    """
    Structured result returned by Kova's reasoning layer.

    The result represents the model's proposed interpretation and plan.
    It is not itself an authorization or execution decision.
    """

    intent: str
    reasoning: str
    proposed_action: str
    inputs: dict[str, Any] = field(default_factory=dict)
    confidence: float | None = None
    raw_response: dict[str, Any] = field(default_factory=dict)