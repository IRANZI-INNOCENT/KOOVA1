"""
The social command center.

Counts and recommendations come from records Kova already has.
A quiet product, a waiting customer, a failed send, and a dropped
connection are stated from those records.
"""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from apps.business_brain.models import BusinessPolicy
from apps.commerce.models import Order, Product
from apps.content.models import Content
from apps.leads.models import Lead
from apps.social.models import SocialAccount, SocialAction, SocialLesson, SocialMessage, SocialPost
from apps.social.services.capabilities import account_capabilities


def build_social_command(business) -> dict:
    now = timezone.now()
    today = now.date()
    posts = SocialPost.objects.filter(social_account__business=business)
    inbound = SocialMessage.objects.filter(
        business=business,
        direction=SocialMessage.Direction.INBOUND,
    )
    waiting = _waiting_messages(inbound)
    leads = Lead.objects.filter(business=business, status=Lead.Status.NEW)
    verified_today = SocialAction.objects.filter(
        business=business,
        action_status=SocialAction.ActionStatus.COMPLETED,
        executed_at__date=today,
    ).count()
    policy = BusinessPolicy.objects.filter(business=business).first()
    accounts = list(SocialAccount.objects.filter(business=business))

    recommendations = []
    if policy and policy.automation_paused:
        recommendations.append({
            "title": "Scheduled publishing is paused",
            "detail": policy.automation_pause_reason
            or "Repeated publishing failures paused scheduled sends. You can still publish a single post yourself.",
            "href": "/workspace/social/calendar",
        })

    for account in accounts:
        if account.connection_status != SocialAccount.ConnectionStatus.CONNECTED:
            recommendations.append({
                "title": f"Reconnect {account.account_name or account.get_platform_display()}",
                "detail": account.connection_error or "Access is no longer healthy. Reconnect so Kova can keep working on this account.",
                "href": "/workspace/social/channels",
            })
            continue
        missing = [
            item["label"]
            for item in account_capabilities(account)
            if not item["available"]
        ]
        if missing:
            recommendations.append({
                "title": f"{account.account_name or account.get_platform_display()} is missing permissions",
                "detail": "Reconnect and allow: " + ", ".join(missing[:4]) + ".",
                "href": "/workspace/social/channels",
            })

    quiet = _quiet_products(business)
    if quiet:
        names = ", ".join(product.name for product in quiet[:2])
        recommendations.append({
            "title": "Create a product promotion",
            "detail": (
                f"{names} "
                f"{'have' if len(quiet) > 1 else 'has'} not been featured in a published post. "
                "Kova can prepare one from the approved product details."
            ),
            "href": "/workspace/commerce",
        })

    review = [
        message for message in waiting
        if message.needs_review or message.intent in {
            SocialMessage.Intent.COMPLAINT,
            SocialMessage.Intent.QUESTION,
            SocialMessage.Intent.BUYING,
        }
    ]
    if review:
        sample = review[0]
        stock_note = _stock_note(sample)
        recommendations.append({
            "title": "A customer needs a response",
            "detail": stock_note or f"{sample.get_intent_display()}: {sample.body[:140]}",
            "href": "/workspace/social/engagement",
        })

    failed = posts.filter(publishing_status=SocialPost.PublishingStatus.FAILED).count()
    if failed:
        recommendations.append({
            "title": "A post did not go out",
            "detail": f"{failed} post{'s' if failed != 1 else ''} failed on the platform. Retry after you check the account, and treat it as failed until the platform accepts it.",
            "href": "/workspace/social/calendar",
        })

    scheduled = posts.filter(publishing_status=SocialPost.PublishingStatus.SCHEDULED).count()
    plan_bits = []
    if quiet:
        plan_bits.append(f"feature {len(quiet)} product{'s' if len(quiet) != 1 else ''} that have been quiet")
    if waiting:
        plan_bits.append(f"answer {len(waiting)} waiting conversation{'s' if len(waiting) != 1 else ''}")
    if scheduled:
        plan_bits.append(f"{scheduled} post{'s' if scheduled != 1 else ''} already on the calendar")
    baseline = 0
    for account in accounts:
        recent = (account.metadata or {}).get("recent_posts")
        if isinstance(recent, list):
            baseline += len(recent)
    if baseline:
        plan_bits.append(f"{baseline} recent posts already on the connected accounts")
    if leads.exists():
        plan_bits.append(f"follow up {leads.count()} new lead{'s' if leads.count() != 1 else ''}")
    summary = (
        "This week: " + ", ".join(plan_bits) + "."
        if plan_bits
        else "Connect a channel and add a product, and Kova will build this week's work from what is actually waiting."
    )

    return {
        "scheduled_posts": scheduled,
        "conversations_to_review": len(waiting),
        "potential_leads": leads.count(),
        "actions_verified_today": verified_today,
        "automation_paused": bool(policy and policy.automation_paused),
        "pause_reason": (policy.automation_pause_reason if policy else "") or "",
        "response_hours": _response_hours(business),
        "recommendations": recommendations[:6],
        "plan": summary,
        "lessons": [
            {"kind": lesson.kind, "summary": lesson.summary}
            for lesson in SocialLesson.objects.filter(business=business)[:5]
        ],
    }


def _waiting_messages(inbound):
    replied_ids = set(
        SocialMessage.objects.filter(
            in_reply_to_id__in=inbound.values("id"),
            delivery_status=SocialMessage.Delivery.SENT,
        ).values_list("in_reply_to_id", flat=True)
    )
    waiting = []
    for message in inbound.filter(
        delivery_status=SocialMessage.Delivery.RECEIVED,
    ).select_related("lead", "lead__product").order_by("-created_at")[:40]:
        if message.id in replied_ids:
            continue
        waiting.append(message)
    return waiting


def _quiet_products(business):
    cutoff = timezone.now() - timedelta(days=21)
    featured = set(
        Content.objects.filter(
            business=business,
            product_id__isnull=False,
            status=Content.Status.PUBLISHED,
            published_at__gte=cutoff,
        ).values_list("product_id", flat=True)
    )
    return list(
        Product.objects.filter(
            business=business,
            status=Product.Status.ACTIVE,
        ).exclude(id__in=featured).order_by("-updated_at")[:6]
    )


def _stock_note(message: SocialMessage) -> str:
    text = (message.body or "").lower()
    asks_stock = any(word in text for word in ("available", "in stock", "left", "still have"))
    if not asks_stock or message.lead_id is None or message.lead.product_id is None:
        if asks_stock:
            return (
                "A customer asked whether something is available. "
                "Stock is not tied to a product on this message, so Kova should ask you rather than guess."
            )
        return ""
    stock = message.lead.product.stock
    if stock is None:
        return (
            f"A customer asked if {message.lead.product.name} is available. "
            "Stock is not recorded, so Kova should ask you rather than invent an answer."
        )
    return ""


def _response_hours(business):
    replies = SocialMessage.objects.filter(
        business=business,
        direction=SocialMessage.Direction.OUTBOUND,
        delivery_status=SocialMessage.Delivery.SENT,
        in_reply_to__isnull=False,
    ).select_related("in_reply_to")[:50]
    gaps = []
    for reply in replies:
        inbound = reply.in_reply_to
        if inbound is None:
            continue
        gap = (reply.created_at - inbound.created_at).total_seconds() / 3600
        if gap >= 0:
            gaps.append(gap)
    if not gaps:
        return None
    return round(sum(gaps) / len(gaps), 1)


def converted_lead_count(business) -> int:
    orders = Order.objects.filter(business=business)
    names = {name.strip().lower() for name in orders.values_list("customer_name", flat=True) if name and name.strip()}
    phones = {phone.strip() for phone in orders.values_list("phone", flat=True) if phone and phone.strip()}
    if not names and not phones:
        return 0
    leads = Lead.objects.filter(business=business).exclude(customer_name="")
    matched = 0
    for lead in leads:
        if lead.customer_name.strip().lower() in names:
            matched += 1
            continue
        if phones and any(phone and phone in (lead.notes or "") for phone in phones):
            matched += 1
    return matched
