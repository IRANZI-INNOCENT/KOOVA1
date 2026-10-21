"""
Weekly report AI reasoning service.
"""

from __future__ import annotations

import json
from datetime import date

from apps.business_brain.services.draft import _parse_json
from apps.businesses.models import Business
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService

from ..models import WeeklyReport
from .gather import current_week_start, gather_weekly_evidence


SYSTEM_PROMPT = """You are Kova — the business's trusted social and commerce teammate.
You are writing this week's personal performance report to the manager who runs
the business. Speak to them by name when evidence.report_to.address_as is set.

Voice and posture:
- This is a manager report, not a public blog post or generic analytics email.
- Address them directly ("you", their first name). Reference THEIR business name,
  location, goals, audience, and brand from evidence.
- Lead with decisions: what to keep doing, what to fix, what you recommend next week.
- Be candid and practical. Avoid advice that could apply to any random shop.
- Tie social activity to their leads/orders when the evidence supports it.

Rules:
- Every number you cite must come from the evidence provided. Do not invent metrics.
- If data is unavailable, say so honestly.
- Be concise — phone-readable.
- Reply with one JSON object and no markdown fences.

Return this exact JSON structure:
{
  "greeting": "<address_as>, here’s your week at <business name>",
  "summary": {
    "headline": "1 sentence verdict spoken to the manager.",
    "metrics": [
      {"label": "<metric name>", "value": <number or string>, "change": "<up/down/steady or null>"}
    ]
  },
  "wins": {
    "summary": "What went well for you this week.",
    "items": [{"title": "...", "description": "..."}]
  },
  "gaps": {
    "summary": "What needs your attention.",
    "items": [{"title": "...", "description": "...", "priority": "high|medium|low"}]
  },
  "channels": {
    "summary": "How your Facebook/Instagram/content performed.",
    "highlights": ["..."]
  },
  "commerce": {
    "summary": "Your products, leads, and orders this week.",
    "highlights": ["..."]
  },
  "next_week": {
    "summary": "What I recommend you focus on next week.",
    "steps": ["Step 1...", "Step 2...", "Step 3..."]
  }
}"""


def generate_weekly_report(
    business: Business,
    *,
    week_start: date | None = None,
    force: bool = False,
) -> WeeklyReport:
    if week_start is None:
        week_start = current_week_start()

    existing = WeeklyReport.objects.filter(
        business=business,
        week_start=week_start,
        status=WeeklyReport.Status.READY,
    ).first()
    if existing and not force:
        return existing

    if force:
        WeeklyReport.objects.filter(
            business=business,
            week_start=week_start,
        ).delete()

    report, _ = WeeklyReport.objects.update_or_create(
        business=business,
        week_start=week_start,
        defaults={"status": WeeklyReport.Status.GENERATING, "error_message": ""},
    )

    try:
        evidence = gather_weekly_evidence(business, week_start=week_start)
        report.evidence = evidence
        sections = _reason(business, evidence)
        address = (
            ((evidence.get("business") or {}).get("report_to") or {}).get("address_as")
            or business.name
        )
        report.greeting = str(
            sections.pop(
                "greeting",
                f"{address}, here’s your week at {business.name}",
            )
        )
        report.sections = sections
        report.status = WeeklyReport.Status.READY
        report.save(
            update_fields=[
                "evidence",
                "greeting",
                "sections",
                "status",
                "updated_at",
            ]
        )
        try:
            from apps.notifications.services.events import send_weekly_report

            send_weekly_report(business, report)
        except Exception:
            pass
    except (OpenRouterError, Exception) as exc:
        report.status = WeeklyReport.Status.FAILED
        report.error_message = str(exc)[:2000]
        report.save(
            update_fields=["status", "error_message", "evidence", "updated_at"]
        )

    return report


def _reason(business: Business, evidence: dict) -> dict:
    report_to = (evidence.get("business") or {}).get("report_to") or {}
    address = report_to.get("address_as") or business.name
    user_prompt = (
        f"Write this week's personal manager report for {address}, "
        f"who runs {business.name}.\n"
        "Speak directly to them. Use their goals, audience, and brand from evidence "
        "so this could only be about their business.\n\n"
        f"Week evidence snapshot:\n{json.dumps(evidence, default=str, ensure_ascii=False)}"
    )
    service = OpenRouterService(timeout=90)
    response = service.chat(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.45,
        max_tokens=2200,
        response_format={"type": "json_object"},
        feature="weekly_brief",
        business_id=getattr(business, "id", None),
    )
    try:
        raw = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenRouterError("Kova could not generate the weekly report.") from exc
    if not isinstance(raw, str):
        raise OpenRouterError("Kova returned the weekly report in an unexpected format.")
    parsed = _parse_json(raw)
    if not isinstance(parsed, dict):
        raise OpenRouterError("Kova returned the weekly report in an unexpected format.")
    return parsed
