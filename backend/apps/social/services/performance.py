"""
Activity counts the analytics and performance pages can show.
"""

from __future__ import annotations

from django.db.models import Sum

from apps.commerce.models import Order
from apps.content.models import Content
from apps.leads.models import Lead
from apps.social.models import SocialLesson, SocialMessage, SocialPost
from apps.social.services.command import build_social_command, converted_lead_count


def performance_snapshot(business) -> dict:
    content = Content.objects.filter(business=business)
    posts = SocialPost.objects.filter(social_account__business=business)
    totals = posts.aggregate(
        reach=Sum("reach"),
        impressions=Sum("impressions"),
        likes=Sum("likes"),
        comments=Sum("comments_count"),
        shares=Sum("shares"),
        clicks=Sum("clicks"),
    )
    leads = Lead.objects.filter(business=business)
    orders = Order.objects.filter(business=business)
    messages = SocialMessage.objects.filter(business=business)

    by_source = {
        source: leads.filter(source=source).count()
        for source, _label in Lead.Source.choices
        if leads.filter(source=source).exists()
    }

    return {
        "content": {
            "drafts": content.filter(status=Content.Status.DRAFT).count(),
            "approved": content.filter(status=Content.Status.APPROVED).count(),
            "published": content.filter(status=Content.Status.PUBLISHED).count(),
        },
        "posts": {
            "published": posts.filter(
                publishing_status=SocialPost.PublishingStatus.PUBLISHED,
            ).count(),
            "scheduled": posts.filter(
                publishing_status=SocialPost.PublishingStatus.SCHEDULED,
            ).count(),
            "failed": posts.filter(
                publishing_status=SocialPost.PublishingStatus.FAILED,
            ).count(),
            "reach": totals["reach"] or 0,
            "impressions": totals["impressions"] or 0,
            "likes": totals["likes"] or 0,
            "comments": totals["comments"] or 0,
            "shares": totals["shares"] or 0,
            "clicks": totals["clicks"] or 0,
        },
        "leads": {
            "total": leads.count(),
            "new": leads.filter(status=Lead.Status.NEW).count(),
            "by_source": by_source,
        },
        "orders": {
            "total": orders.count(),
            "new": orders.filter(status=Order.Status.NEW).count(),
            "fulfilled": orders.filter(status=Order.Status.FULFILLED).count(),
        },
        "messages": {
            "inbound": messages.filter(direction=SocialMessage.Direction.INBOUND).count(),
            "buying": messages.filter(intent=SocialMessage.Intent.BUYING).count(),
            "complaints": messages.filter(intent=SocialMessage.Intent.COMPLAINT).count(),
            "needs_review": messages.filter(needs_review=True).count(),
        },
        "converted_leads": converted_lead_count(business),
        "evidence": [
            lesson.summary
            for lesson in SocialLesson.objects.filter(
                business=business,
                kind=SocialLesson.Kind.VERIFIED,
            )[:5]
        ],
        "observations": [
            lesson.summary
            for lesson in SocialLesson.objects.filter(
                business=business,
                kind=SocialLesson.Kind.OBSERVATION,
            )[:5]
        ],
        "plan": build_social_command(business)["plan"],
    }
