"""Send transactional email through the shared template + Resend."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.notifications.kinds import KIND_CATEGORY
from apps.notifications.models import EmailLog, EmailPreference
from apps.notifications.services.render import EmailContent, render_email, site_base_url
from apps.notifications.services.resend_client import send_email

logger = logging.getLogger(__name__)
User = get_user_model()


def get_or_create_prefs(user) -> EmailPreference:
    prefs, _ = EmailPreference.objects.get_or_create(user=user)
    return prefs


def prefs_url_for(user) -> str:
    prefs = get_or_create_prefs(user)
    return f"{site_base_url()}/workspace/settings/email?token={prefs.token}"


def category_enabled(prefs: EmailPreference, category: str) -> bool:
    return bool(getattr(prefs, category, True))


def greeting_for(user) -> str:
    first = (getattr(user, "first_name", None) or "").strip()
    if first:
        return f"Hi {first},"
    return "Hi,"


def recently_sent(
    *,
    user,
    kind: str,
    business_id: int | None,
    within_minutes: int,
) -> bool:
    since = timezone.now() - timedelta(minutes=within_minutes)
    qs = EmailLog.objects.filter(
        user=user,
        kind=kind,
        status=EmailLog.Status.SENT,
        created_at__gte=since,
    )
    if business_id is not None:
        qs = qs.filter(business_id=business_id)
    return qs.exists()


def notify_user(
    user,
    kind: str,
    *,
    business=None,
    subject: str,
    title: str,
    paragraphs: list[str] | None = None,
    bullets: list[str] | None = None,
    stats: list[dict] | None = None,
    cta_label: str = "Open in KCOVA",
    cta_path: str = "/workspace",
    cta_url: str = "",
    secondary_label: str = "",
    secondary_path: str = "",
    preheader: str = "",
    dedupe_minutes: int = 0,
    force: bool = False,
    meta: dict[str, Any] | None = None,
) -> EmailLog | None:
    """
    Queue a transactional email. Safe to call from request handlers —
    send runs after commit and never raises to the caller.
    """
    if user is None or not getattr(user, "email", None):
        return None

    category = KIND_CATEGORY.get(kind, "alerts")
    prefs = get_or_create_prefs(user)
    # Password reset always sends (account recovery).
    if kind == "password_reset":
        force = True
    if not force and not category_enabled(prefs, category):
        return EmailLog.objects.create(
            user=user,
            business=business,
            kind=kind,
            category=category,
            subject=subject[:255],
            status=EmailLog.Status.SKIPPED,
            error_message="Preference disabled",
            meta=meta or {},
        )

    business_id = getattr(business, "id", None)
    if dedupe_minutes and recently_sent(
        user=user,
        kind=kind,
        business_id=business_id,
        within_minutes=dedupe_minutes,
    ):
        return EmailLog.objects.create(
            user=user,
            business=business,
            kind=kind,
            category=category,
            subject=subject[:255],
            status=EmailLog.Status.SKIPPED,
            error_message=f"Deduped within {dedupe_minutes}m",
            meta=meta or {},
        )

    log = EmailLog.objects.create(
        user=user,
        business=business,
        kind=kind,
        category=category,
        subject=subject[:255],
        status=EmailLog.Status.QUEUED,
        meta=meta or {},
    )

    payload = {
        "log_id": log.id,
        "kind": kind,
        "category": category,
        "subject": subject,
        "title": title,
        "paragraphs": paragraphs or [],
        "bullets": bullets or [],
        "stats": stats or [],
        "cta_label": cta_label,
        "cta_path": cta_path,
        "cta_url": cta_url,
        "secondary_label": secondary_label,
        "secondary_path": secondary_path,
        "preheader": preheader,
        "footer_context": getattr(business, "name", "") if business else "",
        "user_id": user.id,
    }

    def _send():
        try:
            _deliver(payload)
        except Exception:
            logger.exception("Failed to send email kind=%s log=%s", kind, log.id)

    transaction.on_commit(_send)
    return log


def _deliver(payload: dict) -> None:
    log = EmailLog.objects.select_related("user").filter(pk=payload["log_id"]).first()
    if log is None:
        return
    user = log.user
    site = site_base_url()
    cta_url = (payload.get("cta_url") or "").strip()
    if not cta_url and payload.get("cta_path"):
        cta_url = f"{site}{payload['cta_path']}"
    secondary_url = (
        f"{site}{payload['secondary_path']}" if payload.get("secondary_path") else ""
    )
    content = EmailContent(
        category=payload["category"],
        title=payload["title"],
        subject=payload["subject"],
        preheader=payload.get("preheader") or "",
        greeting=greeting_for(user),
        paragraphs=payload.get("paragraphs") or [],
        bullets=payload.get("bullets") or [],
        stats=payload.get("stats") or [],
        cta_label=payload.get("cta_label") or "",
        cta_url=cta_url,
        secondary_label=payload.get("secondary_label") or "",
        secondary_url=secondary_url,
        footer_context=payload.get("footer_context") or "",
        prefs_url=prefs_url_for(user),
    )
    html, text = render_email(content)
    try:
        result = send_email(
            to=user.email,
            subject=payload["subject"],
            html=html,
            text=text,
        )
    except Exception as exc:
        log.status = EmailLog.Status.FAILED
        log.error_message = str(exc)[:2000]
        log.save(update_fields=["status", "error_message"])
        raise

    log.status = EmailLog.Status.SENT
    log.resend_id = str(result.get("id") or "")[:120]
    log.save(update_fields=["status", "resend_id"])
