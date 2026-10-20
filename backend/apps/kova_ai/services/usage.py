"""
Track OpenRouter usage without blocking AI calls.

Callers can wrap work in ``track_ai_usage(feature, business_id=...)`` so
every nested ``OpenRouterService.chat`` is attributed. Optional kwargs on
``chat()`` override the active scope.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Iterator

logger = logging.getLogger(__name__)

_feature: ContextVar[str] = ContextVar("kova_ai_feature", default="unknown")
_business_id: ContextVar[int | None] = ContextVar(
    "kova_ai_business_id",
    default=None,
)


@contextmanager
def track_ai_usage(
    feature: str,
    business_id: int | None = None,
) -> Iterator[None]:
    feature_token = _feature.set((feature or "unknown")[:64])
    business_token = _business_id.set(business_id)
    try:
        yield
    finally:
        _feature.reset(feature_token)
        _business_id.reset(business_token)


def current_feature() -> str:
    return _feature.get() or "unknown"


def current_business_id() -> int | None:
    return _business_id.get()


def record_openrouter_usage(
    *,
    response: dict[str, Any],
    model: str = "",
    feature: str | None = None,
    business_id: int | None = None,
) -> None:
    """
    Persist token usage from an OpenRouter response.

    Never raises — logging must not break product flows.
    """
    try:
        usage = response.get("usage") if isinstance(response, dict) else None
        if not isinstance(usage, dict):
            usage = {}

        prompt_tokens = _as_int(usage.get("prompt_tokens"))
        completion_tokens = _as_int(usage.get("completion_tokens"))
        total_tokens = _as_int(usage.get("total_tokens"))
        if total_tokens <= 0:
            total_tokens = prompt_tokens + completion_tokens

        resolved_feature = (feature or current_feature() or "unknown")[:64]
        resolved_business_id = (
            business_id if business_id is not None else current_business_id()
        )
        resolved_model = (
            str(response.get("model") or model or "")[:120]
        )

        from apps.kova_ai.models import AiUsageEvent

        AiUsageEvent.objects.create(
            business_id=resolved_business_id,
            feature=resolved_feature,
            model_name=resolved_model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=total_tokens,
        )
    except Exception:
        logger.exception("Failed to record OpenRouter usage")


def _as_int(value: Any) -> int:
    try:
        return max(0, int(value or 0))
    except (TypeError, ValueError):
        return 0
