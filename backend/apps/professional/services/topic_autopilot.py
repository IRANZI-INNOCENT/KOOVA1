from __future__ import annotations

from django.utils import timezone

from apps.kova_ai.services.openrouter import OpenRouterError

from ..models import ProfessionalProfile, ProfessionalProgram
from .professional_brain import suggest_autopilot_topic
from .programs import (
    create_topic_week_program,
    monday_of,
    run_topic_week_pipeline,
)


def run_topic_autopilot_for_profile(
    profile: ProfessionalProfile,
    *,
    force: bool = False,
) -> dict:
    if not profile.topic_autopilot_enabled and not force:
        return {"ran": False, "reason": "disabled"}

    if current := _current_program(profile):
        if not force:
            return {
                "ran": False,
                "reason": "week_exists",
                "program_id": current.id,
            }

    topic = suggest_autopilot_topic(profile)
    try:
        program, created = create_topic_week_program(
            profile,
            topic=topic,
            audience="",
            stance="practitioner sharing useful insights",
            autopilot=True,
        )
        if not created and not force:
            return {
                "ran": False,
                "reason": "week_exists",
                "program_id": program.id,
            }

        posts = run_topic_week_pipeline(profile, program)
        profile.topic_autopilot_last_run_at = timezone.now()
        profile.save(update_fields=["topic_autopilot_last_run_at", "updated_at"])
        program.status = ProfessionalProgram.Status.READY
        program.save(update_fields=["status", "updated_at"])

        return {
            "ran": True,
            "program_id": program.id,
            "topic": topic,
            "posts": len(posts),
        }
    except (OpenRouterError, ValueError) as exc:
        return {"ran": False, "reason": "error", "detail": str(exc)[:300]}


def _current_program(profile: ProfessionalProfile) -> ProfessionalProgram | None:
    week_start = monday_of(timezone.now().date()).isoformat()
    return (
        ProfessionalProgram.objects.filter(
            profile=profile,
            program_type=ProfessionalProgram.ProgramType.TOPIC_WEEK,
            input_data__week_start=week_start,
        )
        .first()
    )


def run_all_topic_autopilots() -> int:
    count = 0
    profiles = ProfessionalProfile.objects.filter(topic_autopilot_enabled=True)
    for profile in profiles.iterator():
        result = run_topic_autopilot_for_profile(profile)
        if result.get("ran"):
            count += 1
    return count
