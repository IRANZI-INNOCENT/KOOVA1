"""
Morning brief AI reasoning service.

Takes the gathered evidence and uses the Kova Brain (via OpenRouter)
to produce a structured 6-section brief.  All metrics in the brief
must come from the evidence — the AI interprets and prioritises
but does not invent numbers.
"""

from __future__ import annotations

import json
from datetime import date

from apps.business_brain.services.draft import _parse_json
from apps.businesses.models import Business
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService

from ..models import MorningBrief
from .gather import gather_evidence


SYSTEM_PROMPT = """You are Kova, an intelligent business employee.
You are generating a personalised daily morning brief for a small business owner.

Rules:
- Every number you cite must come from the evidence provided.  Do not invent metrics.
- If data is unavailable, say so honestly.  Do not imply you have full visibility.
- Be specific and actionable.  Avoid generic advice.
- Be concise.  The owner reads this on their phone.
- Adapt the brief to the business type, goals, and connected channels.
- Reply with one JSON object and no markdown fences.

Return this exact JSON structure:
{
  "greeting": "Good morning, <owner name or business name>!",
  "pulse": {
    "summary": "1-2 sentence business pulse.",
    "metrics": [
      {"label": "<metric name>", "value": <number or string>, "change": "<up/down/steady or null>"}
    ]
  },
  "pending": {
    "summary": "What needs the owner's attention today.",
    "items": [
      {"title": "...", "description": "...", "priority": "high|medium|low"}
    ]
  },
  "opportunities": {
    "summary": "Emerging opportunities worth acting on.",
    "items": [
      {"title": "...", "description": "..."}
    ]
  },
  "performance": {
    "summary": "What worked, what underperformed.",
    "highlights": ["..."]
  },
  "plan": {
    "summary": "Today's recommended plan.",
    "steps": ["Step 1...", "Step 2...", "Step 3..."]
  },
  "kova_actions": {
    "completed": ["What Kova already did."],
    "planned": ["What Kova plans to do."],
    "needs_approval": ["What needs the owner's OK."]
  }
}"""


def generate_brief(business: Business, brief_date: date | None = None) -> MorningBrief:
    """
    Generate or refresh the morning brief for a business.

    If a brief for today already exists and is ready, returns it.
    Otherwise creates a new one, gathers evidence, reasons, and saves.
    """
    if brief_date is None:
        brief_date = date.today()

    # Return existing ready brief
    existing = MorningBrief.objects.filter(
        business=business, date=brief_date, status=MorningBrief.Status.READY,
    ).first()
    if existing:
        return existing

    # Create or get the brief record
    brief, _created = MorningBrief.objects.update_or_create(
        business=business,
        date=brief_date,
        defaults={"status": MorningBrief.Status.GENERATING, "error_message": ""},
    )

    try:
        evidence = gather_evidence(business)
        brief.evidence = evidence

        sections = _reason(business, evidence)
        brief.greeting = str(sections.pop("greeting", f"Good morning, {business.name}!"))
        brief.sections = sections
        brief.status = MorningBrief.Status.READY
        brief.save(update_fields=[
            "evidence", "greeting", "sections", "status", "updated_at",
        ])
    except (OpenRouterError, Exception) as exc:
        brief.status = MorningBrief.Status.FAILED
        brief.error_message = str(exc)[:2000]
        brief.save(update_fields=["status", "error_message", "evidence", "updated_at"])

    return brief


def _reason(business: Business, evidence: dict) -> dict:
    """Call the AI to reason over the evidence and produce the brief."""
    user_prompt = (
        f"Generate today's morning brief for the business.\n\n"
        f"Business evidence snapshot:\n{json.dumps(evidence, default=str, ensure_ascii=False)}"
    )

    service = OpenRouterService(timeout=90)
    response = service.chat(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.4,
        max_tokens=2000,
        response_format={"type": "json_object"},
    )

    try:
        raw = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenRouterError("Kova could not generate the morning brief.") from exc

    if not isinstance(raw, str):
        raise OpenRouterError("Kova returned the brief in an unexpected format.")

    parsed = _parse_json(raw)
    if not isinstance(parsed, dict):
        raise OpenRouterError("Kova returned the brief in an unexpected format.")

    return parsed
