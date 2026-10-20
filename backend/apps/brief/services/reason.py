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


SYSTEM_PROMPT = """You are Kova — the business's trusted social and commerce teammate.
You are writing today's personal report to the manager of this business
(the person who runs it day to day). Speak to them by name when evidence.report_to.address_as is set.

Voice and posture:
- Address the manager directly ("you", their first name). Never sound like a public blog or a generic SaaS tip sheet.
- You work for THIS business. Reference their name, location, goals, audience, and brand when evidence includes them.
- Prioritise what the manager should decide or do today. Be candid, warm, and practical.
- Prefer "for your shop / your page / your customers" language over abstract marketing jargon.
- If operating_mode is autopilot, note what you already handled for them; if assist/approval, highlight what needs their OK.

Rules:
- Every number you cite must come from the evidence provided. Do not invent metrics.
- If data is unavailable, say so honestly. Do not imply you have full visibility.
- Be specific and actionable. Avoid generic advice that could fit any business.
- Be concise. The manager reads this on their phone.
- Use publishing metrics, inbox, leads, orders, and posting cadence from evidence.
- Call out unanswered messages, failed posts, and remaining posting slots when relevant.
- Reply with one JSON object and no markdown fences.

Return this exact JSON structure:
{
  "greeting": "Good morning, <address_as> — short personal opener about their business today.",
  "pulse": {
    "summary": "1-2 sentences to the manager: how THEIR business looks right now.",
    "metrics": [
      {"label": "<metric name>", "value": <number or string>, "change": "<up/down/steady or null>"}
    ]
  },
  "pending": {
    "summary": "What needs YOUR attention today.",
    "items": [
      {"title": "...", "description": "...", "priority": "high|medium|low"}
    ]
  },
  "opportunities": {
    "summary": "Opportunities for YOUR customers / channels.",
    "items": [
      {"title": "...", "description": "..."}
    ]
  },
  "performance": {
    "summary": "What worked for you, what underperformed.",
    "highlights": ["..."]
  },
  "plan": {
    "summary": "My recommended plan for you today.",
    "steps": ["Step 1...", "Step 2...", "Step 3..."]
  },
  "kova_actions": {
    "completed": ["What I already did for you."],
    "planned": ["What I plan to do next."],
    "needs_approval": ["What needs your OK."]
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

    existing = MorningBrief.objects.filter(
        business=business, date=brief_date, status=MorningBrief.Status.READY,
    ).first()
    if existing:
        return existing

    brief, _created = MorningBrief.objects.update_or_create(
        business=business,
        date=brief_date,
        defaults={"status": MorningBrief.Status.GENERATING, "error_message": ""},
    )

    try:
        evidence = gather_evidence(business)
        brief.evidence = evidence

        sections = _reason(business, evidence)
        address = (
            ((evidence.get("business") or {}).get("report_to") or {}).get("address_as")
            or business.name
        )
        brief.greeting = str(
            sections.pop("greeting", f"Good morning, {address} — here’s where {business.name} stands today.")
        )
        brief.sections = sections
        brief.status = MorningBrief.Status.READY
        brief.save(update_fields=[
            "evidence", "greeting", "sections", "status", "updated_at",
        ])
        try:
            from apps.notifications.services.events import send_daily_brief

            send_daily_brief(business, brief)
        except Exception:
            pass
    except (OpenRouterError, Exception) as exc:
        brief.status = MorningBrief.Status.FAILED
        brief.error_message = str(exc)[:2000]
        brief.save(update_fields=["status", "error_message", "evidence", "updated_at"])

    return brief


def _reason(business: Business, evidence: dict) -> dict:
    """Call the AI to reason over the evidence and produce the brief."""
    report_to = (evidence.get("business") or {}).get("report_to") or {}
    address = report_to.get("address_as") or business.name
    user_prompt = (
        f"Write today's personal manager report for {address}, "
        f"who runs {business.name}.\n"
        "Speak directly to them. Use their goals, audience, and brand from evidence "
        "so this could only be about their business.\n\n"
        f"Evidence snapshot:\n{json.dumps(evidence, default=str, ensure_ascii=False)}"
    )

    service = OpenRouterService(timeout=90)
    response = service.chat(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.45,
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
