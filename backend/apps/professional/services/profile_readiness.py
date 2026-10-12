from __future__ import annotations

from ..models import ProfessionalProfile


def is_profile_ready(profile: ProfessionalProfile) -> bool:
    if profile.profile_setup_complete:
        return True

    headline = (profile.headline or "").strip()
    role_title = (profile.role_title or "").strip()
    if not headline or not role_title:
        return False

    return profile.pillars.exists()


def mark_profile_setup_if_ready(profile: ProfessionalProfile) -> None:
    if is_profile_ready(profile) and not profile.profile_setup_complete:
        profile.profile_setup_complete = True
        profile.save(update_fields=["profile_setup_complete", "updated_at"])
