from __future__ import annotations

from datetime import date, datetime, timedelta

from django.utils import timezone

from apps.business_brain.services.draft import _parse_json
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService

from ..models import ProfessionalPost, ProfessionalProfile, ProfessionalWeeklyBrief
from .professional_brain import brain_system_rules, gather_brain_snapshot


def _monday_of(d: date) -> date:
    return d - timedelta(days=d.weekday())


def gather_evidence(profile: ProfessionalProfile) -> dict:
    now = timezone.now()
    week_start = _monday_of(now.date())
    posts = list(
        ProfessionalPost.objects.filter(
            profile=profile,
            updated_at__gte=timezone.make_aware(
                datetime.combine(week_start, datetime.min.time()),
            ),
        ).values("status", "post_role", "scheduled_at", "title")[:20],
    )
    brain = gather_brain_snapshot(profile)
    return {
        "week_start": week_start.isoformat(),
        "linkedin_brain": brain,
        "posts_this_week": posts,
        "operating_mode": profile.operating_mode,
    }


SYSTEM = """Create a weekly brief from the LinkedIn Brain and activity evidence.
Suggest topics that fit their pillars and headline — not generic LinkedIn advice.
JSON only:
{
  "greeting": "...",
  "focus": {"summary": "...", "topic_suggestion": "..."},
  "calendar": {"summary": "...", "gaps": ["..."]},
  "pillars": {"summary": "...", "neglected": ["..."]},
  "actions": [{"title": "...", "description": "..."}]
}
"""


def generate_weekly_brief(profile: ProfessionalProfile) -> ProfessionalWeeklyBrief:
    week_start = _monday_of(timezone.now().date())
    brief, _ = ProfessionalWeeklyBrief.objects.get_or_create(
        profile=profile,
        week_start=week_start,
        defaults={"status": ProfessionalWeeklyBrief.Status.GENERATING},
    )
    brief.status = ProfessionalWeeklyBrief.Status.GENERATING
    brief.error_message = ""
    brief.save(update_fields=["status", "error_message", "updated_at"])

    evidence = gather_evidence(profile)
    brief.evidence = evidence
    brief.save(update_fields=["evidence", "updated_at"])

    user = profile.user
    name = user.first_name or user.email.split("@")[0]

    try:
        service = OpenRouterService(timeout=90)
        response = service.chat(
            messages=[
                {"role": "system", "content": f"{brain_system_rules()}\n{SYSTEM}"},
                {
                    "role": "user",
                    "content": f"Owner name: {name}\nEvidence:\n{evidence}",
                },
            ],
            temperature=0.35,
            max_tokens=2000,
            response_format={"type": "json_object"},
            feature="professional",
        )
        raw = response["choices"][0]["message"]["content"]
        data = _parse_json(raw)
        brief.greeting = data.get("greeting", f"Hi {name},")[:200]
        brief.sections = {
            "focus": data.get("focus", {}),
            "calendar": data.get("calendar", {}),
            "pillars": data.get("pillars", {}),
            "actions": data.get("actions", []),
        }
        brief.status = ProfessionalWeeklyBrief.Status.READY
        brief.save()
    except (OpenRouterError, ValueError) as exc:
        brief.status = ProfessionalWeeklyBrief.Status.FAILED
        brief.error_message = str(exc)[:500]
        brief.save(update_fields=["status", "error_message", "updated_at"])

    return brief
