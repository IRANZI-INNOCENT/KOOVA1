"""Aggregated workspace analytics from real business records."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.commerce.models import BusinessExpense, Order, Product, StorefrontEvent
from apps.content.models import Content
from apps.leads.models import Lead
from apps.social.models import SocialMessage, SocialPost

LOW_STOCK_THRESHOLD = 2
TERMINAL_ORDER_STATUSES = {Order.Status.DELIVERED, Order.Status.CANCELLED}


@dataclass(frozen=True)
class AnalyticsWindow:
    start: datetime
    end: datetime
    days: int
    label: str


def resolve_window(
    *,
    period: str | None,
    start_date: date | None,
    end_date: date | None,
) -> AnalyticsWindow:
    now = timezone.now()
    end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    if start_date and end_date:
        if end_date < start_date:
            start_date, end_date = end_date, start_date
        start = timezone.make_aware(
            datetime.combine(start_date, datetime.min.time()),
        )
        end = timezone.make_aware(
            datetime.combine(end_date, datetime.max.time()),
        )
        days = max(1, (end_date - start_date).days + 1)
        return AnalyticsWindow(start=start, end=end, days=days, label="custom")

    mapping = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
        "365d": 365,
    }
    key = (period or "7d").strip().lower()
    days = mapping.get(key, 7)
    start = (end - timedelta(days=days - 1)).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    return AnalyticsWindow(start=start, end=end, days=days, label=key)


def _comparison_window(window: AnalyticsWindow) -> AnalyticsWindow:
    length = window.end - window.start
    prev_end = window.start - timedelta(microseconds=1)
    prev_start = prev_end - length
    return AnalyticsWindow(
        start=prev_start,
        end=prev_end,
        days=window.days,
        label="previous",
    )


def _pct_change(current: int | float, previous: int | float) -> float | None:
    if previous == 0:
        if current == 0:
            return 0.0
        return None
    return round(((current - previous) / previous) * 100, 1)


def _kpi(value: int | float, previous: int | float) -> dict[str, Any]:
    return {
        "value": value,
        "previous": previous,
        "change_pct": _pct_change(value, previous),
    }


def _orders_in_range(business_id: int, start: datetime, end: datetime):
    return Order.objects.filter(
        business_id=business_id,
        created_at__gte=start,
        created_at__lte=end,
    )


def _expenses_in_range(business_id: int, start: date, end: date):
    return BusinessExpense.objects.filter(
        business_id=business_id,
        spent_on__gte=start,
        spent_on__lte=end,
    )


def build_business_analytics(
    business_id: int,
    *,
    period: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict[str, Any]:
    window = resolve_window(
        period=period,
        start_date=start_date,
        end_date=end_date,
    )
    previous = _comparison_window(window)
    currency = (
        Product.objects.filter(business_id=business_id)
        .values_list("currency", flat=True)
        .first()
        or "KES"
    )

    orders = _orders_in_range(business_id, window.start, window.end)
    prev_orders = _orders_in_range(business_id, previous.start, previous.end)

    order_count = orders.exclude(status=Order.Status.CANCELLED).count()
    prev_order_count = prev_orders.exclude(status=Order.Status.CANCELLED).count()

    open_orders = Order.objects.filter(business_id=business_id).exclude(
        status__in=TERMINAL_ORDER_STATUSES
    ).count()

    delivered = orders.filter(status=Order.Status.DELIVERED).count()
    prev_delivered = prev_orders.filter(status=Order.Status.DELIVERED).count()

    expense_qs = _expenses_in_range(
        business_id,
        window.start.date(),
        window.end.date(),
    )
    prev_expense_qs = _expenses_in_range(
        business_id,
        previous.start.date(),
        previous.end.date(),
    )
    expense_total = expense_qs.aggregate(total=Sum("amount"))["total"] or Decimal("0")
    prev_expense_total = prev_expense_qs.aggregate(total=Sum("amount"))["total"] or Decimal(
        "0"
    )

    leads = Lead.objects.filter(
        business_id=business_id,
        created_at__gte=window.start,
        created_at__lte=window.end,
    )
    prev_leads = Lead.objects.filter(
        business_id=business_id,
        created_at__gte=previous.start,
        created_at__lte=previous.end,
    )
    lead_count = leads.count()
    prev_lead_count = prev_leads.count()

    all_leads = Lead.objects.filter(business_id=business_id)
    converted = all_leads.filter(status=Lead.Status.CONVERTED).count()
    eligible = all_leads.exclude(status=Lead.Status.LOST).count()
    conversion_rate = round((converted / eligible) * 100, 1) if eligible else None

    products = Product.objects.filter(business_id=business_id).exclude(
        status=Product.Status.ARCHIVED
    )
    active_products = products.filter(status=Product.Status.ACTIVE).count()
    low_stock = list(
        products.filter(
            status=Product.Status.ACTIVE,
            stock__isnull=False,
            stock__lte=LOW_STOCK_THRESHOLD,
        )
        .order_by("stock", "name")[:12]
        .values("id", "name", "stock", "sku")
    )

    top_products = list(
        orders.exclude(status=Order.Status.CANCELLED)
        .exclude(product_id__isnull=True)
        .values("product_id", "product__name")
        .annotate(order_count=Count("id"))
        .order_by("-order_count")[:8]
    )

    orders_by_day = list(
        orders.exclude(status=Order.Status.CANCELLED)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )

    expenses_by_day = list(
        expense_qs.values("spent_on")
        .annotate(total=Sum("amount"))
        .order_by("spent_on")
    )

    leads_by_day = list(
        leads.annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )

    posts = SocialPost.objects.filter(
        content__business_id=business_id,
        published_at__gte=window.start,
        published_at__lte=window.end,
        publishing_status=SocialPost.PublishingStatus.PUBLISHED,
    )
    prev_posts = SocialPost.objects.filter(
        content__business_id=business_id,
        published_at__gte=previous.start,
        published_at__lte=previous.end,
        publishing_status=SocialPost.PublishingStatus.PUBLISHED,
    )
    posts_published = posts.count()
    prev_posts_published = prev_posts.count()

    engagement = posts.aggregate(
        likes=Sum("likes"),
        comments=Sum("comments_count"),
        shares=Sum("shares"),
        reach=Sum("reach"),
        impressions=Sum("impressions"),
        clicks=Sum("clicks"),
    )

    has_social_metrics = posts.exists() and any(
        (engagement.get(key) or 0) > 0
        for key in ("likes", "comments", "shares", "reach", "impressions", "clicks")
    )

    inbound_messages = SocialMessage.objects.filter(
        business_id=business_id,
        direction=SocialMessage.Direction.INBOUND,
        created_at__gte=window.start,
        created_at__lte=window.end,
    ).count()
    prev_inbound = SocialMessage.objects.filter(
        business_id=business_id,
        direction=SocialMessage.Direction.INBOUND,
        created_at__gte=previous.start,
        created_at__lte=previous.end,
    ).count()

    content_published = Content.objects.filter(
        business_id=business_id,
        status=Content.Status.PUBLISHED,
        published_at__gte=window.start,
        published_at__lte=window.end,
    ).count()

    lead_funnel = {
        "new": all_leads.filter(status=Lead.Status.NEW).count(),
        "contacted": all_leads.filter(status=Lead.Status.CONTACTED).count(),
        "qualified": all_leads.filter(status=Lead.Status.QUALIFIED).count(),
        "converted": converted,
        "lost": all_leads.filter(status=Lead.Status.LOST).count(),
    }

    storefront_events = StorefrontEvent.objects.filter(
        business_id=business_id,
        created_at__gte=window.start,
        created_at__lte=window.end,
    )
    storefront_views = storefront_events.filter(
        kind=StorefrontEvent.Kind.STORE_VIEW
    ).count()
    product_views = storefront_events.filter(
        kind=StorefrontEvent.Kind.PRODUCT_VIEW
    ).count()
    whatsapp_clicks = storefront_events.filter(
        kind__in=[
            StorefrontEvent.Kind.WHATSAPP_HEADER,
            StorefrontEvent.Kind.WHATSAPP_PRODUCT,
        ]
    ).count()

    return {
        "period": {
            "label": window.label,
            "days": window.days,
            "start": window.start.date().isoformat(),
            "end": window.end.date().isoformat(),
        },
        "comparison_period": {
            "start": previous.start.date().isoformat(),
            "end": previous.end.date().isoformat(),
        },
        "currency": currency,
        "availability": {
            "revenue": False,
            "gross_profit": False,
            "payment_status": False,
            "social_engagement": has_social_metrics,
            "meta_reach": has_social_metrics and (engagement.get("reach") or 0) > 0,
        },
        "definitions": {
            "orders": "Store and lead enquiries — not confirmed payments.",
            "expenses": "Cash recorded in Expenses for the selected period.",
            "conversion_rate": "Converted leads divided by all leads except lost.",
        },
        "kpis": {
            "open_orders": {"value": open_orders, "previous": None, "change_pct": None},
            "orders_in_period": _kpi(order_count, prev_order_count),
            "orders_delivered": _kpi(delivered, prev_delivered),
            "expenses_total": _kpi(float(expense_total), float(prev_expense_total)),
            "new_leads": _kpi(lead_count, prev_lead_count),
            "active_products": {
                "value": active_products,
                "previous": None,
                "change_pct": None,
            },
            "low_stock_count": {
                "value": len(low_stock),
                "previous": None,
                "change_pct": None,
            },
            "posts_published": _kpi(posts_published, prev_posts_published),
            "inbound_messages": _kpi(inbound_messages, prev_inbound),
        },
        "leads": {
            "funnel": lead_funnel,
            "conversion_rate_pct": conversion_rate,
        },
        "series": {
            "orders_by_day": [
                {"date": row["day"].isoformat(), "count": row["count"]}
                for row in orders_by_day
                if row["day"]
            ],
            "expenses_by_day": [
                {
                    "date": row["spent_on"].isoformat(),
                    "amount": str(row["total"] or "0"),
                }
                for row in expenses_by_day
            ],
            "leads_by_day": [
                {"date": row["day"].isoformat(), "count": row["count"]}
                for row in leads_by_day
                if row["day"]
            ],
        },
        "products": {
            "low_stock": low_stock,
            "top_by_order_volume": [
                {
                    "product_id": row["product_id"],
                    "name": row["product__name"] or "Product",
                    "orders": row["order_count"],
                }
                for row in top_products
            ],
        },
        "marketing": {
            "content_published_in_workspace": content_published,
            "posts_published": posts_published,
            "storefront_views": storefront_views,
            "storefront_product_views": product_views,
            "storefront_whatsapp_clicks": whatsapp_clicks,
            "engagement_totals": {
                key: int(engagement.get(key) or 0)
                for key in (
                    "likes",
                    "comments",
                    "shares",
                    "reach",
                    "impressions",
                    "clicks",
                )
            },
        },
    }
