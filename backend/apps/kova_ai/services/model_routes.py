"""
Per-task OpenRouter model routing.

Admin can override which model each AI task uses. Defaults favour the
cheapest model that still delivers solid SME value for that workload.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Iterable

from django.conf import settings


@dataclass(frozen=True)
class TaskSpec:
    key: str
    label: str
    default_model: str
    help_text: str
    needs_vision: bool = False
    needs_tools: bool = False


# Curated OpenRouter slugs — keep this list short so admin dropdowns stay useful.
ALLOWED_MODELS: tuple[tuple[str, str], ...] = (
    (
        "google/gemini-2.5-flash-lite",
        "Gemini 2.5 Flash Lite — cheapest (inbox, short JSON)",
    ),
    (
        "google/gemini-3.1-flash-lite",
        "Gemini 3.1 Flash Lite — best cheap default (copy, vision, tools)",
    ),
    (
        "google/gemini-2.5-flash",
        "Gemini 2.5 Flash — stronger mid-tier",
    ),
    (
        "google/gemini-3.8-flash",
        "Gemini 3.8 Flash — highest quality (costliest)",
    ),
)

ALLOWED_MODEL_IDS: frozenset[str] = frozenset(m[0] for m in ALLOWED_MODELS)

# Cost-minimising defaults that still create value.
TASK_SPECS: tuple[TaskSpec, ...] = (
    TaskSpec(
        key="inbox",
        label="Inbox reply drafts",
        default_model="google/gemini-2.5-flash-lite",
        help_text="Customer comment/DM reply suggestions. High volume — keep cheap.",
    ),
    TaskSpec(
        key="broadcast_pack",
        label="Broadcast / review-ask drafts",
        default_model="google/gemini-2.5-flash-lite",
        help_text="Short post-delivery review ask packs.",
    ),
    TaskSpec(
        key="organic_seeds",
        label="Organic content seeds",
        default_model="google/gemini-2.5-flash-lite",
        help_text="Idea seeds for organic posts (often cached).",
    ),
    TaskSpec(
        key="schedule",
        label="Content schedule planner",
        default_model="google/gemini-2.5-flash-lite",
        help_text="JSON schedule slots for posts.",
    ),
    TaskSpec(
        key="starters",
        label="Ask Kova starter prompts",
        default_model="google/gemini-2.5-flash-lite",
        help_text="Home-screen suggested questions for the owner.",
    ),
    TaskSpec(
        key="business_draft",
        label="Business profile section drafts",
        default_model="google/gemini-2.5-flash-lite",
        help_text="Short profile / audience / brand field drafts.",
    ),
    TaskSpec(
        key="draft",
        label="Single post draft",
        default_model="google/gemini-3.1-flash-lite",
        help_text="One platform caption/draft. Needs readable voice.",
    ),
    TaskSpec(
        key="organic",
        label="Organic content pack",
        default_model="google/gemini-3.1-flash-lite",
        help_text="Multi-piece organic content generation.",
    ),
    TaskSpec(
        key="campaign",
        label="Product campaign pack",
        default_model="google/gemini-3.1-flash-lite",
        help_text="Multi-platform product campaign JSON.",
    ),
    TaskSpec(
        key="morning_brief",
        label="Morning brief",
        default_model="google/gemini-3.1-flash-lite",
        help_text="Daily business brief from evidence.",
    ),
    TaskSpec(
        key="weekly_brief",
        label="Weekly report",
        default_model="google/gemini-3.1-flash-lite",
        help_text="Weekly business report.",
    ),
    TaskSpec(
        key="autopilot",
        label="Autopilot shift planner",
        default_model="google/gemini-3.1-flash-lite",
        help_text="Plans Autopilot work for a shift (nested calls use their own tasks).",
    ),
    TaskSpec(
        key="ask_kova",
        label="Ask Kova (agent + tools)",
        default_model="google/gemini-3.1-flash-lite",
        help_text="Owner chat with tool calling. Prefer Flash Lite; raise if tools fail.",
        needs_tools=True,
    ),
    TaskSpec(
        key="product_vision",
        label="Snap to Sell / product vision",
        default_model="google/gemini-3.1-flash-lite",
        help_text="Photo → listing. Multimodal; raise to 3.8 if quality drops.",
        needs_vision=True,
    ),
    TaskSpec(
        key="product_polish",
        label="Product listing polish",
        default_model="google/gemini-3.1-flash-lite",
        help_text="Rewrite store-facing listing from photos + facts.",
        needs_vision=True,
    ),
    TaskSpec(
        key="market_research",
        label="Market research (web search)",
        default_model="google/gemini-3.1-flash-lite",
        help_text="Web-grounded market brief. Search fees apply on top of tokens.",
    ),
    TaskSpec(
        key="website_scan",
        label="Website profile scan",
        default_model="google/gemini-3.1-flash-lite",
        help_text="Extract business profile fields from a website.",
    ),
    TaskSpec(
        key="professional",
        label="LinkedIn / professional programs",
        default_model="google/gemini-3.1-flash-lite",
        help_text="Topic weeks, programs, professional weekly briefs.",
    ),
    TaskSpec(
        key="reasoning",
        label="Internal reasoner",
        default_model="google/gemini-2.5-flash-lite",
        help_text="Structured reasoning helper (low volume).",
    ),
)

TASK_BY_KEY: dict[str, TaskSpec] = {t.key: t for t in TASK_SPECS}

# Usage labels that share a configured route.
TASK_ALIASES: dict[str, str] = {
    "snap_to_sell": "product_vision",
}


def canonical_task_key(task_key: str | None) -> str:
    key = (task_key or "").strip()[:64]
    if not key:
        return ""
    return TASK_ALIASES.get(key, key)


def task_choices() -> list[tuple[str, str]]:
    return [(t.key, t.label) for t in TASK_SPECS]


def model_choices() -> list[tuple[str, str]]:
    return list(ALLOWED_MODELS)


def default_model_for_task(task_key: str) -> str:
    key = canonical_task_key(task_key)
    spec = TASK_BY_KEY.get(key)
    if spec:
        return spec.default_model
    return (
        getattr(settings, "OPENROUTER_MODEL", "")
        or "google/gemini-3.1-flash-lite"
    )


def env_fallback_model() -> str:
    return (
        getattr(settings, "OPENROUTER_MODEL", "")
        or "google/gemini-3.1-flash-lite"
    )


def clear_route_cache() -> None:
    resolve_model_for_task.cache_clear()


@lru_cache(maxsize=64)
def resolve_model_for_task(task_key: str | None) -> str:
    """
    Resolve OpenRouter model id for a task key.

    Order: DB route → catalog default → OPENROUTER_MODEL env.
    """
    key = canonical_task_key(task_key)
    if not key or key == "unknown":
        return env_fallback_model()

    try:
        from apps.kova_ai.models import AiModelRoute

        row = (
            AiModelRoute.objects.filter(task_key=key)
            .values_list("model_id", flat=True)
            .first()
        )
        if row:
            return str(row)
    except Exception:
        # DB may be unavailable during migrate/tests — fall through.
        pass

    return default_model_for_task(key)


def ensure_default_routes() -> int:
    """
    Create missing AiModelRoute rows with catalog defaults.

    Returns number of rows created.
    """
    from apps.kova_ai.models import AiModelRoute

    created = 0
    existing = set(
        AiModelRoute.objects.filter(
            task_key__in=[t.key for t in TASK_SPECS],
        ).values_list("task_key", flat=True)
    )
    to_create = [
        AiModelRoute(
            task_key=spec.key,
            model_id=spec.default_model,
        )
        for spec in TASK_SPECS
        if spec.key not in existing
    ]
    if to_create:
        AiModelRoute.objects.bulk_create(to_create)
        created = len(to_create)
        clear_route_cache()
    return created


def iter_task_specs() -> Iterable[TaskSpec]:
    return TASK_SPECS
