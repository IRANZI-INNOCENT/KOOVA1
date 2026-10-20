"""Lead follow-up scheduling with template drafts (no extra LLM spend)."""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from apps.leads.models import Lead

OPEN_STATUSES = {
    Lead.Status.NEW,
    Lead.Status.CONTACTED,
    Lead.Status.QUALIFIED,
}


def build_follow_up_draft(lead: Lead) -> str:
    name = (lead.customer_name or "").strip() or "there"
    interest = (lead.interest or "").strip()
    product = ""
    if lead.product_id and lead.product:
        product = lead.product.name
    topic = product or interest or "what you asked about"
    business = lead.business.name
    return (
        f"Hi {name}, just checking back from {business} about {topic}. "
        f"Happy to answer any questions or help you place an order when you're ready."
    )


def schedule_initial_follow_up(lead: Lead, *, days: int = 1) -> Lead:
    if lead.status not in OPEN_STATUSES:
        return lead
    if lead.next_follow_up_at is not None:
        return lead
    lead.next_follow_up_at = timezone.now() + timedelta(days=days)
    if not (lead.follow_up_draft or "").strip():
        lead.follow_up_draft = build_follow_up_draft(lead)
    lead.save(
        update_fields=[
            "next_follow_up_at",
            "follow_up_draft",
            "updated_at",
        ]
    )
    return lead


def bump_stale_follow_ups(*, days: int = 3) -> int:
    """
    For open leads whose follow-up is overdue by ``days`` since creation
    (or last follow-up), refresh draft and push next_follow_up_at to now.
    """
    now = timezone.now()
    cutoff = now - timedelta(days=days)
    qs = Lead.objects.filter(
        status__in=OPEN_STATUSES,
        created_at__lte=cutoff,
    ).filter(
        models_q_due(now),
    )
    updated = 0
    for lead in qs.select_related("product", "business")[:200]:
        lead.follow_up_draft = build_follow_up_draft(lead)
        lead.next_follow_up_at = now
        lead.save(update_fields=["follow_up_draft", "next_follow_up_at", "updated_at"])
        updated += 1
    return updated


def models_q_due(now):
    from django.db.models import Q

    return Q(next_follow_up_at__isnull=True) | Q(next_follow_up_at__lte=now)


def due_follow_ups(business) -> list[Lead]:
    now = timezone.now()
    return list(
        Lead.objects.filter(
            business=business,
            status__in=OPEN_STATUSES,
        )
        .filter(models_q_due(now))
        .select_related("product")
        .order_by("next_follow_up_at", "-created_at")[:50]
    )


def mark_followed_up(lead: Lead) -> Lead:
    now = timezone.now()
    lead.last_followed_up_at = now
    lead.next_follow_up_at = now + timedelta(days=3)
    if lead.status == Lead.Status.NEW:
        lead.status = Lead.Status.CONTACTED
    lead.save(
        update_fields=[
            "last_followed_up_at",
            "next_follow_up_at",
            "status",
            "updated_at",
        ]
    )
    return lead
