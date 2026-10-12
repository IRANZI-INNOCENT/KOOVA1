from __future__ import annotations

import json
from datetime import date, datetime, time, timedelta
from typing import Any

from django.utils import timezone

from apps.business_brain.services.draft import _parse_json
from apps.kova_ai.services.openrouter import OpenRouterError, OpenRouterService

from ..models import ProfessionalPost, ProfessionalProgram, ProfessionalProfile
from .linkedin_content import LINKEDIN_ALGORITHM_RULES
from .professional_brain import (
    attach_brain_to_program_input,
    brain_system_rules,
    format_brain_for_prompt,
    gather_brain_snapshot,
)


def _ai_json(system: str, user: str, *, temperature: float = 0.4) -> dict:
    service = OpenRouterService(timeout=90)
    response = service.chat(
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        max_tokens=2500,
        response_format={"type": "json_object"},
    )
    try:
        raw = response["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise OpenRouterError("Kova could not finish that request.") from exc
    if not isinstance(raw, str):
        raise OpenRouterError("Kova returned an unexpected format.")
    parsed = _parse_json(raw)
    if not isinstance(parsed, dict):
        raise OpenRouterError("Kova returned an unexpected format.")
    return parsed


def _brain_user_block(profile: ProfessionalProfile, *, topic: str = "", extra: str = "") -> str:
    snapshot = gather_brain_snapshot(profile, topic=topic)
    block = format_brain_for_prompt(snapshot)
    if extra:
        return f"{extra.strip()}\n\n{block}"
    return block


TOPIC_WEEK_PLAN_PROMPT = """Plan exactly 3 posts for one week on the given topic.
Align each post with the LinkedIn Brain (pillars, voice, headline).
Mix post roles: authority, take, conversation.
Prefer one carousel_outline and two text posts when it fits.

Return JSON only:
{
  "title": "short program title",
  "posts": [
    {
      "arc_index": 1,
      "post_role": "authority|take|story|conversation",
      "format": "text|carousel_outline",
      "title": "internal label",
      "summary": "what this post achieves in one sentence",
      "hook_hint": "optional first-line hook idea",
      "suggested_day": "Tuesday"
    }
  ]
}
"""


def plan_topic_week(
    profile: ProfessionalProfile,
    *,
    topic: str,
    audience: str = "",
    stance: str = "",
) -> dict[str, Any]:
    user_msg = _brain_user_block(
        profile,
        topic=topic,
        extra=(
            f"Topic: {topic}\n"
            f"Audience: {audience or 'peers in their industry'}\n"
            f"Stance: {stance or 'practitioner sharing useful insights'}"
        ),
    )
    try:
        plan = _ai_json(
            f"{brain_system_rules()}\n{TOPIC_WEEK_PLAN_PROMPT}",
            user_msg,
            temperature=0.4,
        )
    except OpenRouterError as exc:
        raise ValueError(str(exc)) from exc
    if not plan.get("posts") or len(plan["posts"]) < 3:
        raise ValueError("Kova could not build a three-post plan. Try again.")
    return plan


def monday_of(day: date) -> date:
    return day - timedelta(days=day.weekday())


DAY_NAME_OFFSET = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}


def current_topic_week_program(
    profile: ProfessionalProfile,
) -> ProfessionalProgram | None:
    week_start = monday_of(timezone.now().date()).isoformat()
    return (
        ProfessionalProgram.objects.filter(
            profile=profile,
            program_type=ProfessionalProgram.ProgramType.TOPIC_WEEK,
            input_data__week_start=week_start,
        )
        .order_by("-created_at")
        .first()
    )


def create_topic_week_program(
    profile: ProfessionalProfile,
    *,
    topic: str,
    audience: str = "",
    stance: str = "",
    autopilot: bool = False,
) -> tuple[ProfessionalProgram, bool]:
    """Returns (program, created). Reuses the current week's program if one exists."""
    existing = current_topic_week_program(profile)
    if existing:
        return existing, False

    plan = plan_topic_week(
        profile,
        topic=topic,
        audience=audience,
        stance=stance,
    )
    week_start = monday_of(timezone.now().date())
    input_data = attach_brain_to_program_input(
        profile,
        {
            "topic": topic,
            "audience": audience,
            "stance": stance,
            "week_start": week_start.isoformat(),
            "autopilot": autopilot,
        },
        topic=topic,
    )
    program = ProfessionalProgram.objects.create(
        profile=profile,
        program_type=ProfessionalProgram.ProgramType.TOPIC_WEEK,
        status=ProfessionalProgram.Status.PLANNING,
        title=str(plan.get("title", topic))[:240],
        input_data=input_data,
        plan=plan,
    )
    return program, True


def schedule_topic_week_posts(
    profile: ProfessionalProfile,
    program: ProfessionalProgram,
    posts: list[ProfessionalPost],
) -> list[ProfessionalPost]:
    """Assign Tue/Thu/Sat-style slots from the plan and mark scheduled."""
    plan = program.plan or {}
    plan_items = {
        int(item.get("arc_index", index + 1)): item
        for index, item in enumerate(plan.get("posts") or [])
    }
    week_start_raw = program.input_data.get("week_start")
    if week_start_raw:
        week_start = date.fromisoformat(str(week_start_raw))
    else:
        week_start = monday_of(timezone.now().date())

    fallback_days = ("tuesday", "thursday", "saturday")
    now = timezone.now()
    ordered = sorted(posts, key=lambda post: post.arc_index)

    for index, post in enumerate(ordered):
        item = plan_items.get(post.arc_index, {})
        day_key = str(item.get("suggested_day", fallback_days[index % 3])).lower()
        offset = DAY_NAME_OFFSET.get(day_key, 1 + index * 2)
        slot_date = week_start + timedelta(days=offset)
        slot_naive = datetime.combine(slot_date, time(hour=9, minute=0))
        scheduled_at = timezone.make_aware(
            slot_naive,
            timezone.get_current_timezone(),
        )
        if scheduled_at <= now:
            scheduled_at = now + timedelta(hours=18 + index * 24)

        post.scheduled_at = scheduled_at
        if post.body.strip() or post.carousel_slides:
            if profile.topic_autopilot_enabled:
                post.status = ProfessionalPost.Status.SCHEDULED
            elif post.status == ProfessionalPost.Status.DRAFT:
                post.status = ProfessionalPost.Status.SCHEDULED
        post.save(update_fields=["scheduled_at", "status", "updated_at"])

    return ordered


def run_topic_week_pipeline(
    profile: ProfessionalProfile,
    program: ProfessionalProgram,
) -> list[ProfessionalPost]:
    posts = generate_drafts_for_program(program)
    return schedule_topic_week_posts(profile, program, posts)


DRAFTS_PROMPT = (
    "Draft LinkedIn posts that match the LinkedIn Brain voice and pillars.\n"
    f"{LINKEDIN_ALGORITHM_RULES}\n"
    "For carousel_outline format, return slides as a list of strings in carousel_slides.\n"
    "Keep each text post under 2800 characters. Strong hook in line 1.\n"
    "Each post should connect to the primary pillar when one is listed.\n"
    "When program input mentions event photos or image hints, weave them into the event post naturally.\n\n"
    "Return JSON only:\n"
    '{"posts": [{"arc_index": 1, "post_role": "...", "format": "text|carousel_outline", '
    '"title": "...", "body": "full post text for text format", '
    '"carousel_slides": ["slide 1", "..."]}]}\n'
)


def generate_drafts_for_program(program: ProfessionalProgram) -> list[ProfessionalPost]:
    profile = program.profile
    plan = program.plan or {}
    topic = str((program.input_data or {}).get("topic", ""))
    image_note = ""
    if program.program_type == ProfessionalProgram.ProgramType.EVENT_MOMENT:
        hints = (program.input_data or {}).get("image_hint") or ""
        count = program.event_images.count()
        if program.event_image:
            count = max(count, 1)
        if count:
            image_note = (
                f"\nThe member uploaded {count} event photo(s). "
                f"Photo context: {hints or 'see program input'}.\n"
            )

    user_msg = _brain_user_block(
        profile,
        topic=topic,
        extra=(
            f"Program type: {program.program_type}\n"
            f"Program title: {program.title or plan.get('title', '')}\n"
            f"Plan:\n{json.dumps(plan, indent=2)}\n"
            f"Program input:\n{json.dumps(program.input_data, indent=2)}"
            f"{image_note}"
        ),
    )
    try:
        data = _ai_json(
            f"{brain_system_rules()}\n{DRAFTS_PROMPT}",
            user_msg,
            temperature=0.55,
        )
    except OpenRouterError as exc:
        raise ValueError(str(exc)) from exc
    created: list[ProfessionalPost] = []
    program.posts.filter(program=program).delete()

    valid_roles = {choice[0] for choice in ProfessionalPost.PostRole.choices}
    valid_formats = {choice[0] for choice in ProfessionalPost.Format.choices}

    for item in data.get("posts", [])[:3]:
        role = item.get("post_role", ProfessionalPost.PostRole.AUTHORITY)
        if role not in valid_roles:
            role = ProfessionalPost.PostRole.AUTHORITY
        fmt = item.get("format", ProfessionalPost.Format.TEXT)
        if fmt not in valid_formats:
            fmt = ProfessionalPost.Format.TEXT
        post = ProfessionalPost.objects.create(
            profile=profile,
            program=program,
            arc_index=int(item.get("arc_index", len(created) + 1)),
            post_role=role,
            format=fmt,
            title=item.get("title", "")[:200],
            body=item.get("body", ""),
            carousel_slides=item.get("carousel_slides") or [],
            status=ProfessionalPost.Status.DRAFT,
        )
        created.append(post)

    program.status = ProfessionalProgram.Status.READY
    program.save(update_fields=["status", "updated_at"])
    return created


EVENT_QUESTION_PROMPT = """You help a professional reflect on an event for LinkedIn.
Given event context, return ONE high-leverage question to unlock an authentic post.
Return JSON: {"question": "...", "event_title_guess": "..."}
"""


def suggest_event_question(
    profile: ProfessionalProfile,
    *,
    event_type: str,
    event_title: str,
    image_hint: str = "",
) -> dict[str, str]:
    user_msg = _brain_user_block(
        profile,
        extra=(
            f"Event type: {event_type or 'conference'}\n"
            f"Event title: {event_title or 'unknown'}\n"
            f"Image hints: {image_hint or 'none'}"
        ),
    )
    try:
        data = _ai_json(
            f"{brain_system_rules()}\n{EVENT_QUESTION_PROMPT}",
            user_msg,
            temperature=0.3,
        )
    except OpenRouterError:
        return {
            "question": "What is the one insight you are taking back to your work on Monday?",
            "event_title_guess": event_title or "Your event",
        }
    return {
        "question": data.get(
            "question",
            "What is the one insight you are taking back to your work on Monday?",
        ),
        "event_title_guess": data.get("event_title_guess", event_title or "Your event"),
    }


EVENT_PLAN_PROMPT = (
    "Plan 1 to 3 LinkedIn posts as an arc after someone attended an event.\n"
    f"{LINKEDIN_ALGORITHM_RULES}\n"
    'Post 1 should be the visual "event" post (photos will attach); later posts deepen story or authority.\n'
    "Return JSON:\n"
    '{"title": "...", "posts": [{"arc_index": 1, "post_role": "event|story|authority|conversation", '
    '"format": "text|carousel_outline", "title": "...", "summary": "...", '
    '"suggested_timing": "same day|+2 days|+5 days"}]}\n'
)


def plan_event_arc(
    profile: ProfessionalProfile,
    *,
    event_title: str,
    answer: str,
    arc_length: int,
) -> dict[str, Any]:
    user_msg = _brain_user_block(
        profile,
        topic=event_title,
        extra=(
            f"Event: {event_title}\n"
            f"Their answer to the reflection question:\n{answer}\n"
            f"Number of posts in arc: {max(1, min(3, arc_length))}"
        ),
    )
    plan = _ai_json(
        f"{brain_system_rules()}\n{EVENT_PLAN_PROMPT}",
        user_msg,
        temperature=0.45,
    )
    posts = plan.get("posts") or []
    plan["posts"] = posts[:arc_length]
    return plan
