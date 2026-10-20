"""Domain helpers that compose notify_user for each email kind."""

from __future__ import annotations

from apps.notifications.kinds import EmailKind
from apps.notifications.services.notify import notify_user


def _biz_subject(business, verb: str) -> str:
    name = (getattr(business, "name", None) or "KCOVA").strip()
    return f"{name}: {verb}"


def send_welcome(user) -> None:
    notify_user(
        user,
        EmailKind.WELCOME,
        subject="Welcome to KCOVA",
        title="Your workspace is ready",
        paragraphs=[
            "KCOVA helps you run social, leads, and your store from one place.",
            "Start by setting up your business, connecting Facebook or Instagram, and adding products.",
        ],
        cta_label="Open your workspace",
        cta_path="/workspace",
        preheader="Get started with social, leads, and commerce.",
    )


def send_password_reset(user, *, reset_url: str) -> None:
    notify_user(
        user,
        EmailKind.PASSWORD_RESET,
        subject="Reset your KCOVA password",
        title="Reset your password",
        paragraphs=[
            "We received a request to reset your KCOVA password.",
            "This link expires in one hour. If you did not ask for this, you can ignore the email.",
        ],
        cta_label="Choose a new password",
        cta_url=reset_url,
        cta_path="",
        preheader="Use this link to choose a new password.",
        force=True,
    )


def send_publish_failed(business, *, platform: str, error: str, post_id: int | None = None) -> None:
    owner = getattr(business, "owner", None)
    if owner is None:
        return
    platform_label = (platform or "social").replace("_", " ").title()
    notify_user(
        owner,
        EmailKind.PUBLISH_FAILED,
        business=business,
        subject=_biz_subject(business, f"Post failed on {platform_label}"),
        title=f"A post failed on {platform_label}",
        paragraphs=[
            "KCOVA could not publish one of your posts.",
            (error or "Publishing failed.")[:400],
        ],
        cta_label="Review posts",
        cta_path="/workspace/social",
        dedupe_minutes=30,
        meta={"post_id": post_id, "platform": platform},
    )


def send_automation_paused(business, *, reason: str) -> None:
    owner = getattr(business, "owner", None)
    if owner is None:
        return
    notify_user(
        owner,
        EmailKind.AUTOMATION_PAUSED,
        business=business,
        subject=_biz_subject(business, "Publishing paused"),
        title="Scheduled publishing is paused",
        paragraphs=[
            reason
            or "Publishing failed repeatedly, so KCOVA paused automatic sends until you review.",
        ],
        cta_label="Fix publishing",
        cta_path="/workspace/social/channels",
        dedupe_minutes=120,
    )


def send_approval_needed(business, *, action_summary: str) -> None:
    owner = getattr(business, "owner", None)
    if owner is None:
        return
    notify_user(
        owner,
        EmailKind.APPROVAL_NEEDED,
        business=business,
        subject=_biz_subject(business, "Approval needed"),
        title="Something needs your approval",
        paragraphs=[
            action_summary or "KCOVA is waiting for your OK before continuing.",
        ],
        cta_label="Review actions",
        cta_path="/workspace/social",
        dedupe_minutes=60,
    )


def send_new_lead(business, lead) -> None:
    owner = getattr(business, "owner", None)
    if owner is None:
        return
    name = (getattr(lead, "customer_name", None) or "A customer").strip() or "A customer"
    interest = (getattr(lead, "interest", None) or "")[:220]
    source = (getattr(lead, "source", None) or "social").replace("_", " ")
    notify_user(
        owner,
        EmailKind.NEW_LEAD,
        business=business,
        subject=_biz_subject(business, f"New lead — {name}"),
        title=f"New lead: {name}",
        paragraphs=[
            f"Source: {source}.",
            interest or "They reached out about your business.",
        ],
        cta_label="Open leads",
        cta_path="/workspace/leads",
        meta={"lead_id": lead.id},
    )


def send_new_order(business, order) -> None:
    owner = getattr(business, "owner", None)
    if owner is None:
        return
    product_name = ""
    if getattr(order, "product_id", None) and getattr(order, "product", None):
        product_name = order.product.name
    customer = (getattr(order, "customer_name", None) or "Customer").strip() or "Customer"
    bullets = []
    if getattr(order, "note", None):
        bullets.append(str(order.note)[:200])
    notify_user(
        owner,
        EmailKind.NEW_ORDER,
        business=business,
        subject=_biz_subject(business, f"New order — {product_name or customer}"),
        title="New store order",
        paragraphs=[
            f"{customer} placed an order"
            + (f" for {product_name}." if product_name else "."),
            f"Phone: {(order.phone or 'not left').strip()}.",
        ],
        bullets=bullets or None,
        cta_label="Open orders",
        cta_path="/workspace/commerce/orders",
        meta={"order_id": order.id},
    )


def send_daily_brief(business, brief) -> None:
    owner = getattr(business, "owner", None)
    if owner is None:
        return
    sections = getattr(brief, "sections", None) or {}
    pulse = sections.get("pulse") or {}
    summary = (pulse.get("summary") or brief.greeting or "Your daily manager report is ready.")[:400]
    notify_user(
        owner,
        EmailKind.DAILY_BRIEF,
        business=business,
        subject=_biz_subject(business, "Daily brief"),
        title="Your daily manager report",
        paragraphs=[summary],
        cta_label="Read full brief",
        cta_path="/workspace/analytics",
        dedupe_minutes=12 * 60,
        meta={"brief_id": brief.id, "date": str(brief.date)},
    )


def send_weekly_report(business, report) -> None:
    owner = getattr(business, "owner", None)
    if owner is None:
        return
    sections = getattr(report, "sections", None) or {}
    summary = sections.get("summary") or {}
    headline = (
        summary.get("headline")
        or report.greeting
        or "Your weekly manager report is ready."
    )[:400]
    notify_user(
        owner,
        EmailKind.WEEKLY_REPORT,
        business=business,
        subject=_biz_subject(business, "Weekly report"),
        title="Your weekly manager report",
        paragraphs=[headline],
        cta_label="Read weekly report",
        cta_path="/workspace/analytics",
        dedupe_minutes=24 * 60,
        meta={"report_id": report.id, "week_start": str(report.week_start)},
    )
