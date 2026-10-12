"""
LinkedIn professional brain — structured profile context for all Kova AI on
personal LinkedIn content (plans, drafts, briefs, autopilot).
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.utils import timezone

from ..models import ProfessionalPost, ProfessionalProfile, ProfessionalProgram


def gather_brain_snapshot(
    profile: ProfessionalProfile,
    *,
    topic: str = "",
) -> dict[str, Any]:
    pillars = [
        {
            "name": p.name,
            "description": p.description,
            "weight": p.weight,
        }
        for p in profile.pillars.all().order_by("-weight", "sort_order")[:5]
    ]

    recent_topics = list(
        ProfessionalProgram.objects.filter(
            profile=profile,
            program_type=ProfessionalProgram.ProgramType.TOPIC_WEEK,
        )
        .order_by("-created_at")
        .values("title", "input_data", "created_at")[:6],
    )

    recent_posts = list(
        ProfessionalPost.objects.filter(profile=profile)
        .order_by("-updated_at")
        .values("title", "post_role", "status", "body")[:5],
    )
    for row in recent_posts:
        body = row.get("body") or ""
        row["body_excerpt"] = body[:160] + ("…" if len(body) > 160 else "")

    matched_pillar = match_topic_to_pillar(profile, topic) if topic else None
    voice = _voice_profile(profile)

    return {
        "identity": {
            "headline": profile.headline,
            "role_title": profile.role_title,
            "industry": profile.industry,
            "owner_name": _owner_name(profile),
        },
        "voice": voice,
        "pillars": pillars,
        "topic": topic.strip() if topic else "",
        "matched_pillar": matched_pillar,
        "operating_mode": profile.operating_mode,
        "topic_autopilot_enabled": profile.topic_autopilot_enabled,
        "standing_topic": profile.topic_autopilot_standing_topic,
        "recent_topic_weeks": [
            {
                "title": row["title"],
                "topic": (row.get("input_data") or {}).get("topic", ""),
                "pillar": (row.get("input_data") or {}).get("brain", {}).get(
                    "matched_pillar",
                ),
            }
            for row in recent_topics
        ],
        "recent_posts": recent_posts,
    }


def brain_system_rules() -> str:
    return (
        "You are Kova, an intelligent LinkedIn content partner for ONE professional.\n"
        "The LinkedIn Brain block below is the source of truth for voice and positioning.\n"
        "Rules:\n"
        "- Write in their voice: headline, role, tone notes, and pillars define what fits.\n"
        "- Tie the week's topic to a content pillar when possible.\n"
        "- Do not invent employers, clients, metrics, awards, or events not in the input.\n"
        "- If credentials are unclear, use general practitioner language.\n"
        "- Respect tone boundaries (off-limits topics, style) in tone_notes.\n"
        "- Prefer specific, useful LinkedIn posts over generic motivation.\n"
    )


def format_brain_for_prompt(snapshot: dict[str, Any]) -> str:
    identity = snapshot.get("identity") or {}
    voice = snapshot.get("voice") or {}
    pillars = snapshot.get("pillars") or []

    pillar_lines = []
    for pillar in pillars:
        desc = pillar.get("description") or ""
        weight = pillar.get("weight", 1)
        line = f"- {pillar['name']} (weight {weight})"
        if desc:
            line += f": {desc}"
        pillar_lines.append(line)

    parts = [
        "=== LINKEDIN BRAIN ===",
        f"Headline: {identity.get('headline') or 'not set'}",
        f"Role: {identity.get('role_title') or 'not set'}",
        f"Industry: {identity.get('industry') or 'not set'}",
        f"Voice summary: {voice.get('summary', '')}",
        f"Tone & boundaries: {voice.get('tone_notes') or 'professional, clear'}",
        "Content pillars:",
        "\n".join(pillar_lines) if pillar_lines else "- none defined",
    ]

    if snapshot.get("topic"):
        parts.append(f"This request topic: {snapshot['topic']}")
    if snapshot.get("matched_pillar"):
        parts.append(f"Primary pillar for this topic: {snapshot['matched_pillar']}")

    recent = snapshot.get("recent_topic_weeks") or []
    if recent:
        parts.append(
            "Recent topic weeks (avoid repeating the same angle): "
            + ", ".join(
                str(item.get("topic") or item.get("title") or "")
                for item in recent[:3]
                if item.get("topic") or item.get("title")
            ),
        )

    return "\n".join(parts)


def match_topic_to_pillar(profile: ProfessionalProfile, topic: str) -> str | None:
    topic_lower = topic.lower()
    best_name: str | None = None
    best_score = 0

    for pillar in profile.pillars.all():
        name = pillar.name
        score = 0
        if name.lower() in topic_lower or topic_lower in name.lower():
            score += 3
        for word in name.lower().split():
            if len(word) > 3 and word in topic_lower:
                score += 1
        desc = (pillar.description or "").lower()
        for word in topic_lower.split():
            if len(word) > 4 and word in desc:
                score += 1
        score += min(pillar.weight, 3)
        if score > best_score:
            best_score = score
            best_name = name

    return best_name if best_score > 0 else None


def suggest_autopilot_topic(profile: ProfessionalProfile) -> str:
    standing = (profile.topic_autopilot_standing_topic or "").strip()
    if standing:
        return standing

    pillar_name = _least_used_pillar(profile)
    if pillar_name:
        return pillar_name

    industry = (profile.industry or "your field").strip()
    role = (profile.role_title or "professional").strip()
    return f"{role} on {industry}"


def _least_used_pillar(profile: ProfessionalProfile) -> str | None:
    pillars = list(profile.pillars.order_by("-weight", "sort_order"))
    if not pillars:
        return None

    since = timezone.now() - timedelta(days=45)
    recent = ProfessionalProgram.objects.filter(
        profile=profile,
        program_type=ProfessionalProgram.ProgramType.TOPIC_WEEK,
        created_at__gte=since,
    )

    use_counts: dict[str, int] = {p.name: 0 for p in pillars}
    for program in recent:
        data = program.input_data or {}
        brain = data.get("brain") or {}
        pillar = brain.get("matched_pillar") or match_topic_to_pillar(
            profile,
            str(data.get("topic", program.title)),
        )
        if pillar and pillar in use_counts:
            use_counts[pillar] += 1

    pillars.sort(key=lambda p: (use_counts.get(p.name, 0), -p.weight))
    return pillars[0].name if pillars else None


def attach_brain_to_program_input(
    profile: ProfessionalProfile,
    input_data: dict[str, Any],
    *,
    topic: str,
) -> dict[str, Any]:
    snapshot = gather_brain_snapshot(profile, topic=topic)
    merged = dict(input_data)
    merged["brain"] = snapshot
    if snapshot.get("matched_pillar"):
        merged["primary_pillar"] = snapshot["matched_pillar"]
    return merged


def _owner_name(profile: ProfessionalProfile) -> str:
    user = profile.user
    name = f"{user.first_name} {user.last_name}".strip()
    return name or user.email.split("@")[0]


def _voice_profile(profile: ProfessionalProfile) -> dict[str, str]:
    tone = (profile.tone_notes or "").strip()
    headline = (profile.headline or "").strip()
    role = (profile.role_title or "").strip()

    summary_parts = []
    if role:
        summary_parts.append(f"Speaks as a {role}.")
    if headline:
        summary_parts.append(f"Public positioning: {headline}.")
    if tone:
        summary_parts.append(f"Style notes: {tone}")
    else:
        summary_parts.append("Style: clear, professional, first-person.")

    return {
        "summary": " ".join(summary_parts),
        "tone_notes": tone or "professional, clear, no hype",
    }
