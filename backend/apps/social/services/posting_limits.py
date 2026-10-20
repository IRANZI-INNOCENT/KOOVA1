"""
Per-business social posting cadence.

Meta does not publish a fixed frequency. Defaults match common Page/IG
guidance (Facebook ~1–2/day, Instagram ~3–5/week) and are owner-editable
on BusinessPolicy.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from django.db.models import Q
from django.utils import timezone

from apps.businesses.models import Business
from apps.content.models import Content
from apps.social.models import SocialAccount, SocialPost

NAIROBI = ZoneInfo("Africa/Nairobi")

HARD_MAX_DAY = 10
HARD_MAX_WEEK = 40


@dataclass(frozen=True)
class CadenceLimits:
    facebook_max_per_day: int
    facebook_max_per_week: int
    instagram_max_per_day: int
    instagram_max_per_week: int
    min_hours_between: int


def get_cadence_limits(business: Business) -> CadenceLimits:
    from apps.business_brain.models import BusinessPolicy

    policy, _ = BusinessPolicy.objects.get_or_create(business=business)
    return CadenceLimits(
        facebook_max_per_day=min(int(policy.facebook_max_posts_per_day), HARD_MAX_DAY),
        facebook_max_per_week=min(int(policy.facebook_max_posts_per_week), HARD_MAX_WEEK),
        instagram_max_per_day=min(int(policy.instagram_max_posts_per_day), HARD_MAX_DAY),
        instagram_max_per_week=min(int(policy.instagram_max_posts_per_week), HARD_MAX_WEEK),
        min_hours_between=max(1, min(int(policy.min_hours_between_posts), 48)),
    )


def platform_key(platform: str) -> str:
    platform = (platform or "").lower()
    if platform in {
        Content.Platform.FACEBOOK,
        SocialAccount.Platform.FACEBOOK_PAGE,
        "facebook",
        "facebook_page",
    }:
        return "facebook"
    if platform in {
        Content.Platform.INSTAGRAM,
        SocialAccount.Platform.INSTAGRAM,
        "instagram",
    }:
        return "instagram"
    return ""


def _limits_for_platform(limits: CadenceLimits, key: str) -> tuple[int, int]:
    if key == "facebook":
        return limits.facebook_max_per_day, limits.facebook_max_per_week
    if key == "instagram":
        return limits.instagram_max_per_day, limits.instagram_max_per_week
    return 0, 0


def _day_start(local: datetime) -> datetime:
    return local.replace(hour=0, minute=0, second=0, microsecond=0)


def _week_start(local: datetime) -> datetime:
    start = _day_start(local)
    return start - timedelta(days=start.weekday())


def _counted_statuses() -> list[str]:
    return [
        SocialPost.PublishingStatus.PENDING,
        SocialPost.PublishingStatus.SCHEDULED,
        SocialPost.PublishingStatus.PUBLISHING,
        SocialPost.PublishingStatus.PUBLISHED,
    ]


def _account_platform(key: str) -> str:
    if key == "facebook":
        return SocialAccount.Platform.FACEBOOK_PAGE
    return SocialAccount.Platform.INSTAGRAM


def posts_in_window(
    business: Business,
    *,
    platform_key_name: str,
    window_start: datetime,
    window_end: datetime,
) -> int:
    if platform_key_name not in {"facebook", "instagram"}:
        return 0
    account_platform = _account_platform(platform_key_name)
    qs = SocialPost.objects.filter(
        social_account__business=business,
        social_account__platform=account_platform,
        publishing_status__in=_counted_statuses(),
    )
    return qs.filter(
        Q(published_at__gte=window_start, published_at__lt=window_end)
        | Q(
            published_at__isnull=True,
            scheduled_at__gte=window_start,
            scheduled_at__lt=window_end,
        )
        | Q(
            published_at__isnull=True,
            scheduled_at__isnull=True,
            created_at__gte=window_start,
            created_at__lt=window_end,
        ),
    ).count()


def remaining_slots(
    business: Business,
    platform: str,
    *,
    now: datetime | None = None,
) -> int:
    key = platform_key(platform)
    if not key:
        return 0
    limits = get_cadence_limits(business)
    day_max, week_max = _limits_for_platform(limits, key)
    if day_max <= 0 or week_max <= 0:
        return 0
    now = now or timezone.now()
    local = now.astimezone(NAIROBI)
    day_start = _day_start(local)
    day_end = day_start + timedelta(days=1)
    week_start = _week_start(local)
    week_end = week_start + timedelta(days=7)
    used_day = posts_in_window(
        business,
        platform_key_name=key,
        window_start=day_start,
        window_end=day_end,
    )
    used_week = posts_in_window(
        business,
        platform_key_name=key,
        window_start=week_start,
        window_end=week_end,
    )
    return max(0, min(day_max - used_day, week_max - used_week))


def last_post_at(business: Business, platform: str) -> datetime | None:
    key = platform_key(platform)
    if not key:
        return None
    post = (
        SocialPost.objects.filter(
            social_account__business=business,
            social_account__platform=_account_platform(key),
            publishing_status__in=_counted_statuses(),
        )
        .order_by("-published_at", "-scheduled_at", "-created_at")
        .first()
    )
    if post is None:
        return None
    return post.published_at or post.scheduled_at or post.created_at


def plan_publish_times(
    business: Business,
    contents: list[Content],
    *,
    now: datetime | None = None,
    preferred: dict[int, datetime] | None = None,
) -> list[tuple[Content, datetime]]:
    """
    Assign cadence-safe times for a batch. Omits pieces that cannot fit
    within about two weeks under the business limits.

    ``preferred`` maps content id → requested time; the planner never
    places earlier than that (still respecting day/week/gap caps).
    """
    now = now or timezone.now()
    limits = get_cadence_limits(business)
    gap = timedelta(hours=limits.min_hours_between)
    preferred = preferred or {}

    # Seed usage from DB, then add reservations as we place.
    day_used: dict[tuple[str, date], int] = {}
    week_used: dict[tuple[str, date], int] = {}
    last_by: dict[str, datetime] = {}

    for key in ("facebook", "instagram"):
        last = last_post_at(business, key)
        if last is not None:
            last_by[key] = last
        for offset in range(0, 14):
            local = now.astimezone(NAIROBI) + timedelta(days=offset)
            d0 = _day_start(local)
            d1 = d0 + timedelta(days=1)
            day_used[(key, d0.date())] = posts_in_window(
                business,
                platform_key_name=key,
                window_start=d0,
                window_end=d1,
            )
        w0 = _week_start(now.astimezone(NAIROBI))
        for week_i in range(0, 3):
            ws = w0 + timedelta(days=7 * week_i)
            we = ws + timedelta(days=7)
            week_used[(key, ws.date())] = posts_in_window(
                business,
                platform_key_name=key,
                window_start=ws,
                window_end=we,
            )

    planned: list[tuple[Content, datetime]] = []

    for content in contents:
        key = platform_key(content.platform)
        if not key:
            continue
        day_max, week_max = _limits_for_platform(limits, key)
        if day_max <= 0 or week_max <= 0:
            continue

        earliest = now
        want = preferred.get(content.id)
        if want is not None:
            if timezone.is_naive(want):
                want = timezone.make_aware(want)
            earliest = max(earliest, want)
        if key in last_by:
            earliest = max(earliest, last_by[key] + gap)

        placed = False
        for offset in range(0, 14):
            local_day = now.astimezone(NAIROBI) + timedelta(days=offset)
            d0 = _day_start(local_day)
            d1 = d0 + timedelta(days=1)
            day_key = (key, d0.date())
            if day_used.get(day_key, 0) >= day_max:
                continue

            w0 = _week_start(local_day)
            week_key = (key, w0.date())
            if week_used.get(week_key, 0) >= week_max:
                continue

            slot = earliest
            if slot < d0:
                # Prefer mid-morning Nairobi for shopper attention.
                slot = d0 + timedelta(hours=11)
            if slot >= d1:
                continue

            planned.append((content, slot))
            day_used[day_key] = day_used.get(day_key, 0) + 1
            week_used[week_key] = week_used.get(week_key, 0) + 1
            last_by[key] = slot
            placed = True
            break

        if not placed:
            continue

    return planned


def can_autopilot_publish_more(business: Business) -> bool:
    for platform in (Content.Platform.FACEBOOK, Content.Platform.INSTAGRAM):
        if remaining_slots(business, platform) > 0:
            return True
    return False
