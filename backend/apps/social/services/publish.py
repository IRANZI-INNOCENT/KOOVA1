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

from apps.commerce.services.storefront import append_product_link
from apps.content.models import Content
from apps.social.adapters.meta import MetaAdapter
from apps.social.models import SocialAccount, SocialAction, SocialLesson, SocialMessage, SocialPost

MAX_ATTEMPTS = 3

PLATFORM_ACCOUNT = {
    Content.Platform.INSTAGRAM: SocialAccount.Platform.INSTAGRAM,
    Content.Platform.FACEBOOK: SocialAccount.Platform.FACEBOOK_PAGE,
}


class PublishError(Exception):
    pass


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

    account_platform = PLATFORM_ACCOUNT.get(content.platform)
    if account_platform is None:
        _ready_message(content)
        return None

    account = (
        SocialAccount.objects.filter(
            business=content.business,
            platform=account_platform,
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        .order_by("-connected_at")
        .first()
    )
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
    caption = outgoing_text(content)
    price_error = price_conflict(content, caption)
    if price_error:
        post.publishing_status = SocialPost.PublishingStatus.FAILED
        post.publishing_error = price_error
        post.save(update_fields=["publishing_status", "publishing_error", "updated_at"])
        _record_publish_action(account, content, post, False, price_error, {})
        _maybe_pause(account.business_id)
        raise PublishError(price_error)
    image_url = ""
    if isinstance(content.media_urls, list) and content.media_urls:
        image_url = str(content.media_urls[0] or "")

    try:
        result = MetaAdapter().publish_post(
            account,
            caption,
            image_url=image_url,
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

    since = timezone.now() - timedelta(hours=24)
    failures = SocialPost.objects.filter(
        social_account__business_id=business_id,
        publishing_status=SocialPost.PublishingStatus.FAILED,
        last_attempt_at__gte=since,
    ).count()
    if failures < 3:
        return
    policy = BusinessPolicy.objects.filter(business_id=business_id).first()
    if policy is None or policy.automation_paused:
        return
    policy.automation_paused = True
    policy.automation_pause_reason = (
        "Publishing failed three times in a day. "
        "Scheduled sends are paused until you retry a post or reconnect the account."
    )
    policy.save(update_fields=["automation_paused", "automation_pause_reason", "updated_at"])


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
    expected = f"{product.price:.0f}" if product.price == int(product.price) else f"{product.price:.2f}"
    normalized = {amount.replace(",", "") for amount in amounts}
    if expected in normalized:
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


def outgoing_text(content) -> str:
    """Caption that goes to the platform, with carousel slides written as text."""
    parts: list[str] = []
    caption = (content.caption or "").strip()
    if caption:
        parts.append(caption)
    lines: list[str] = []
    slides = content.slides if isinstance(content.slides, list) else []
    for index, slide in enumerate(slides, start=1):
        text = ""
        if isinstance(slide, dict):
            text = str(slide.get("caption") or "").strip()
        elif isinstance(slide, str):
            text = slide.strip()
        if text:
            lines.append(f"{index}. {text}")
    if lines:
        parts.append("\n".join(lines))
    action = (content.call_to_action or "").strip()
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
