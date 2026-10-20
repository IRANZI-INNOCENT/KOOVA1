"""
Queue a content piece onto a connected account and send it.

Instagram and Facebook go through the Meta adapter. Other channels
are kept as a ready message in the inbox, because Kova does not
have an API for them. Failed sends stay on the post and can be
retried up to three times.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta

from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.commerce.services.storefront import absolute_media_url, append_product_link
from apps.content.models import Content
from apps.content.services.content_quality import (
    can_publish_native_carousel,
    carousel_image_urls_from_content,
    merge_slide_captions_into_body,
    sanitize_copy,
    strip_swipe_language,
)
from apps.social.adapters.meta import MetaAdapter
from apps.social.models import SocialAccount, SocialAction, SocialLesson, SocialMessage, SocialPost

MAX_ATTEMPTS = 3

_VIDEO_SUFFIXES = (".mp4", ".mov", ".webm", ".m4v", ".mpeg", ".mpg")


def _is_video_media(url: str, content: Content) -> bool:
    lowered = (url or "").lower().split("?", 1)[0]
    if any(lowered.endswith(suffix) for suffix in _VIDEO_SUFFIXES):
        return True
    if content.content_type == Content.ContentType.REEL and content.media_urls:
        return True
    return False


PLATFORM_ACCOUNT = {
    Content.Platform.INSTAGRAM: SocialAccount.Platform.INSTAGRAM,
    Content.Platform.FACEBOOK: SocialAccount.Platform.FACEBOOK_PAGE,
}


class PublishError(Exception):
    pass


def _account_for_content(content: Content) -> SocialAccount | None:
    """Use the channel the draft was written for; never a random sibling Page."""
    account_platform = PLATFORM_ACCOUNT.get(content.platform)
    if account_platform is None:
        return None

    linked = getattr(content, "social_account", None)
    if linked is not None and linked.pk:
        if (
            linked.business_id == content.business_id
            and linked.platform == account_platform
            and linked.connection_status
            == SocialAccount.ConnectionStatus.CONNECTED
        ):
            return linked

    return (
        SocialAccount.objects.filter(
            business=content.business,
            platform=account_platform,
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        .order_by("-connected_at")
        .first()
    )


def enqueue(content: Content, scheduled_at: datetime | None = None) -> SocialPost | None:
    """
    Put a post on the queue.

    A future scheduled_at waits. Anything else is sent now.
    Channels without a Meta account are saved as an outbound message.
    """
    if content.status == Content.Status.REJECTED:
        raise PublishError("Rejected posts stay out. Draft a new one.")

    if scheduled_at and timezone.is_naive(scheduled_at):
        scheduled_at = timezone.make_aware(scheduled_at)

    if PLATFORM_ACCOUNT.get(content.platform) is None:
        _ready_message(content)
        return None

    account = _account_for_content(content)
    if account is None:
        label = "Instagram" if content.platform == Content.Platform.INSTAGRAM else "Facebook"
        raise PublishError(f"Connect {label} before publishing this post.")

    if content.social_account_id is None:
        content.social_account = account
        content.save(update_fields=["social_account", "updated_at"])

    due_later = scheduled_at is not None and scheduled_at > timezone.now()
    post, _created = SocialPost.objects.get_or_create(
        content=content,
        social_account=account,
        defaults={
            "publishing_status": (
                SocialPost.PublishingStatus.SCHEDULED
                if due_later
                else SocialPost.PublishingStatus.PENDING
            ),
            "scheduled_at": scheduled_at,
        },
    )
    if due_later:
        post.publishing_status = SocialPost.PublishingStatus.SCHEDULED
        post.scheduled_at = scheduled_at
        post.publishing_error = ""
        post.save(update_fields=[
            "publishing_status", "scheduled_at", "publishing_error", "updated_at",
        ])
        if content.status == Content.Status.DRAFT:
            content.status = Content.Status.APPROVED
            content.save(update_fields=["status", "updated_at"])
        return post

    return dispatch_post(post)


def publish_autopilot_batch(business, content_ids: list[int]) -> list[dict]:
    """
    Autopilot: enqueue drafts at cadence-safe times from BusinessPolicy.

    Pieces that fit today's remaining slots go out during the shift;
    later ones land on future open slots (hours/days apart), not every
    75 seconds.
    """
    from apps.social.services.posting_limits import plan_publish_times

    contents = list(
        Content.objects.filter(business=business, pk__in=content_ids)
        .exclude(status=Content.Status.REJECTED)
        .select_related("product")
        .order_by("id")
    )
    if not contents:
        raise ValueError("There is no content to publish.")

    now = timezone.now()
    planned = plan_publish_times(business, contents, now=now)
    if not planned:
        raise ValueError(
            "Posting limits are full for your Facebook/Instagram cadence. "
            "Raise the limits under Settings → Business policy, or wait "
            "for the next open slot."
        )

    rows: list[dict] = []
    for content, when in planned:
        enqueue(content, when)
        delta = when - now
        if delta <= timedelta(seconds=90):
            reason = "Autopilot: publishing now (within your posting limits)."
        else:
            hours = max(1, int(delta.total_seconds() // 3600))
            reason = (
                f"Autopilot: scheduled in about {hours}h to respect "
                "your Facebook/Instagram posting limits."
            )
        rows.append(
            {
                "content_id": content.id,
                "platform": content.platform,
                "content_type": content.content_type,
                "product_name": content.product.name if content.product_id else "",
                "scheduled_at": when.isoformat(),
                "reason": reason,
            }
        )

    dispatch_due(business.id)
    return rows


def dispatch_due(business_id: int | None = None) -> int:
    """Send every post that is due. Returns how many were attempted."""
    now = timezone.now()
    posts = SocialPost.objects.filter(
        publishing_status__in=[
            SocialPost.PublishingStatus.PENDING,
            SocialPost.PublishingStatus.SCHEDULED,
        ],
        publishing_attempts__lt=MAX_ATTEMPTS,
    ).select_related("content", "social_account")
    if business_id is not None:
        posts = posts.filter(social_account__business_id=business_id)

    attempted = 0
    for post in posts:
        if post.scheduled_at and post.scheduled_at > now:
            continue
        if post.publishing_status == SocialPost.PublishingStatus.PUBLISHED:
            continue
        if _automation_paused(post.social_account.business_id):
            continue
        dispatch_post(post)
        attempted += 1
    return attempted


def dispatch_post(post: SocialPost) -> SocialPost:
    """Send one post and record the platform result."""
    if post.publishing_attempts >= MAX_ATTEMPTS:
        return post

    post.publishing_status = SocialPost.PublishingStatus.PUBLISHING
    post.publishing_attempts += 1
    post.last_attempt_at = timezone.now()
    post.save(update_fields=[
        "publishing_status", "publishing_attempts", "last_attempt_at", "updated_at",
    ])

    content = post.content
    account = post.social_account
    carousel_urls = carousel_image_urls_from_content(content)
    native_carousel = (
        content.content_type == Content.ContentType.CAROUSEL
        and can_publish_native_carousel(carousel_urls)
    )
    caption = outgoing_text(content, native_carousel=native_carousel)
    price_error = price_conflict(content, caption)
    if price_error:
        post.publishing_status = SocialPost.PublishingStatus.FAILED
        post.publishing_error = price_error
        post.save(update_fields=["publishing_status", "publishing_error", "updated_at"])
        _record_publish_action(account, content, post, False, price_error, {})
        _maybe_pause(account.business_id)
        raise PublishError(price_error)
    image_url = ""
    image_urls: list[str] = []
    video_url = ""
    if native_carousel:
        image_urls = carousel_urls[:10]
    elif isinstance(content.media_urls, list) and content.media_urls:
        first = absolute_media_url(str(content.media_urls[0] or ""))
        if _is_video_media(first, content):
            video_url = first
        else:
            image_url = first
            image_urls = [first] if first else []

    try:
        result = MetaAdapter().publish_post(
            account,
            caption,
            image_url=image_url,
            image_urls=image_urls or None,
            video_url=video_url,
        )
    except Exception as exc:
        result_ok = False
        error = str(exc)[:1000]
        external_id = ""
        raw = {}
    else:
        result_ok = result.success
        error = result.error or ""
        external_id = result.external_post_id or ""
        raw = result.raw_response or {}

    if result_ok:
        post.publishing_status = SocialPost.PublishingStatus.PUBLISHED
        post.external_post_id = external_id
        post.published_at = timezone.now()
        post.publishing_error = ""
        post.platform_response = raw
        content.status = Content.Status.PUBLISHED
        content.published_at = post.published_at
        content.save(update_fields=["status", "published_at", "updated_at"])
        action_result = f"Published to {account.account_name or account.platform}."
    else:
        post.publishing_status = SocialPost.PublishingStatus.FAILED
        post.publishing_error = error or "Publishing failed."
        post.platform_response = raw
        action_result = post.publishing_error

    post.save(update_fields=[
        "publishing_status",
        "external_post_id",
        "published_at",
        "publishing_error",
        "platform_response",
        "updated_at",
    ])
    _record_publish_action(account, content, post, result_ok, action_result, raw)
    _remember_outcome(post, result_ok, action_result)
    if not result_ok:
        try:
            from apps.notifications.services.events import send_publish_failed

            send_publish_failed(
                account.business,
                platform=account.platform,
                error=post.publishing_error,
                post_id=post.id,
            )
        except Exception:
            pass
        _maybe_pause(account.business_id)
        raise PublishError(post.publishing_error)
    return post


def _record_publish_action(account, content, post, result_ok, action_result, raw):
    SocialAction.objects.create(
        business=account.business,
        social_account=account,
        action_type=SocialAction.ActionType.PUBLISH,
        action_status=(
            SocialAction.ActionStatus.COMPLETED
            if result_ok
            else SocialAction.ActionStatus.FAILED
        ),
        intent=f"Publish content {content.id}.",
        result=action_result,
        platform_response=raw,
        requires_approval=False,
        executed_at=timezone.now(),
        target_type="post",
        target_id=str(post.id),
    )


def _remember_outcome(post, result_ok, action_result):
    product = post.content.product.name if post.content.product_id else ""
    SocialLesson.objects.create(
        business=post.social_account.business,
        kind=SocialLesson.Kind.VERIFIED if result_ok else SocialLesson.Kind.OBSERVATION,
        summary=action_result,
        evidence={
            "post_id": post.id,
            "product": product,
            "platform": post.social_account.platform,
            "status": post.publishing_status,
        },
    )


def _automation_paused(business_id: int) -> bool:
    from apps.business_brain.models import BusinessPolicy

    policy = BusinessPolicy.objects.filter(business_id=business_id).first()
    if policy and policy.social_operating_mode == policy.OperatingMode.AUTOPILOT:
        return False
    return bool(policy and policy.automation_paused)


def _maybe_pause(business_id: int) -> None:
    from apps.business_brain.models import BusinessPolicy

    policy = BusinessPolicy.objects.filter(business_id=business_id).first()
    if policy and policy.social_operating_mode == policy.OperatingMode.AUTOPILOT:
        return

    since = timezone.now() - timedelta(hours=24)
    failures = SocialPost.objects.filter(
        social_account__business_id=business_id,
        publishing_status=SocialPost.PublishingStatus.FAILED,
        last_attempt_at__gte=since,
    ).count()
    if failures < 3:
        return
    if policy is None or policy.automation_paused:
        return
    policy.automation_paused = True
    policy.automation_pause_reason = (
        "Publishing failed three times in a day. "
        "Scheduled sends are paused until you retry a post or reconnect the account."
    )
    policy.save(update_fields=["automation_paused", "automation_pause_reason", "updated_at"])
    try:
        from apps.notifications.services.events import send_automation_paused

        send_automation_paused(
            policy.business,
            reason=policy.automation_pause_reason,
        )
    except Exception:
        pass


def price_conflict(content, caption: str) -> str:
    """Stop a post that names a different price from the product record."""

    product = getattr(content, "product", None)
    if product is None or product.price is None:
        return ""
    amounts = re.findall(
        r"(?:ksh|kes)\s*([0-9][0-9,]*)",
        caption or "",
        flags=re.IGNORECASE,
    )
    if not amounts:
        return ""
    from decimal import Decimal, InvalidOperation

    try:
        expected_value = Decimal(str(product.price))
    except InvalidOperation:
        return ""
    normalized = set()
    for amount in amounts:
        try:
            normalized.add(Decimal(amount.replace(",", "")))
        except InvalidOperation:
            continue
    for found in normalized:
        if abs(found - expected_value) <= Decimal("1"):
            return ""
    return (
        f"The caption price does not match {product.name} at "
        f"{product.currency} {product.price}. Kova will not publish a different price."
    )


def refresh_metrics(post: SocialPost) -> SocialPost:
    """Pull reach and engagement for a post that already has a platform id."""
    if not post.external_post_id:
        return post
    try:
        metrics = MetaAdapter().get_post_metrics(
            post.social_account,
            post.external_post_id,
        )
    except Exception:
        post.metrics_updated_at = timezone.now()
        post.save(update_fields=["metrics_updated_at", "updated_at"])
        return post
    for field in ("reach", "impressions", "likes", "comments_count", "shares", "clicks"):
        if field in metrics:
            setattr(post, field, int(metrics[field] or 0))
    post.metrics_updated_at = timezone.now()
    post.save()
    return post


def refresh_due_metrics(business_id: int, *, limit: int = 6, max_age_minutes: int = 20) -> int:
    """Refresh published posts whose counts are missing or older than the window."""
    cutoff = timezone.now() - timedelta(minutes=max_age_minutes)
    due = SocialPost.objects.filter(
        social_account__business_id=business_id,
        publishing_status=SocialPost.PublishingStatus.PUBLISHED,
    ).exclude(external_post_id="").filter(
        Q(metrics_updated_at__isnull=True) | Q(metrics_updated_at__lt=cutoff)
    ).select_related("social_account").order_by("-published_at")[:limit]
    refreshed = 0
    for post in due:
        refresh_metrics(post)
        refreshed += 1
    return refreshed


def outgoing_text(content, *, native_carousel: bool | None = None) -> str:
    """
    Caption that goes to the platform.

    Native carousels keep a clean caption (slides are on the images).
    Fake/single-image "carousels" fold slide ideas into prose — never as a
    numbered swipe deck.
    """
    slides = content.slides if isinstance(content.slides, list) else []
    media = carousel_image_urls_from_content(content)
    if native_carousel is None:
        native_carousel = (
            getattr(content, "content_type", "") == Content.ContentType.CAROUSEL
            and can_publish_native_carousel(media)
        )

    caption = (content.caption or "").strip()
    action = (content.call_to_action or "").strip()
    caption, action = sanitize_copy(
        caption,
        action,
        allow_swipe=bool(native_carousel),
    )

    if native_carousel:
        body = caption
    elif slides:
        body = merge_slide_captions_into_body(caption, slides)
    else:
        body = strip_swipe_language(caption)

    parts: list[str] = []
    if body:
        parts.append(body)
    if action:
        parts.append(action)
    if content.hashtags:
        tags = " ".join(f"#{tag.lstrip('#')}" for tag in content.hashtags if tag)
        if tags:
            parts.append(tags)
    return append_product_link("\n\n".join(parts), getattr(content, "product", None))


def parse_when(value) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    parsed = parse_datetime(str(value))
    if parsed is None:
        raise PublishError("Use a date and time for the schedule.")
    return parsed


def _ready_message(content: Content) -> None:
    """Save a channel Kova cannot post to as a message the owner can send."""
    channel = content.platform if content.platform in {
        SocialMessage.Channel.WHATSAPP,
        SocialMessage.Channel.INSTAGRAM,
        SocialMessage.Channel.FACEBOOK,
    } else SocialMessage.Channel.WEB
    SocialMessage.objects.create(
        business=content.business,
        channel=channel,
        direction=SocialMessage.Direction.OUTBOUND,
        body=outgoing_text(content),
        intent=SocialMessage.Intent.OTHER,
    )
    content.status = Content.Status.PUBLISHED
    content.published_at = timezone.now()
    content.save(update_fields=["status", "published_at", "updated_at"])
