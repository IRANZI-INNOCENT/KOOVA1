"""
KCOVA Analytics Tool.

Reads real business data to provide analytics. Queries actual models
to compute metrics rather than returning placeholder responses.
"""

from __future__ import annotations

from typing import Any

from django.utils import timezone

from apps.commerce.models import Order, Product
from apps.content.models import Content
from apps.leads.models import Lead
from apps.kova_ai.context.types import BusinessContext
from apps.kova_ai.decisions.types import Decision, DecisionAction

from .base import Tool
from .types import ToolResult, ToolStatus


class GetAnalyticsTool(Tool):
    """Retrieve business analytics from real data."""

    @property
    def action(self) -> str:
        return DecisionAction.GET_ANALYTICS

    @property
    def description(self) -> str:
        return (
            "Retrieve business performance analytics computed from "
            "real business data: products, leads, content, and engagement."
        )

    @property
    def parameters(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "metric": {
                    "type": "string",
                    "enum": [
                        "sales",
                        "orders",
                        "leads",
                        "content",
                        "engagement",
                        "overview",
                    ],
                },
                "period": {
                    "type": "string",
                    "description": "Reporting period: today, week, month, all.",
                },
            },
            "required": ["metric"],
            "additionalProperties": False,
        }

    def execute(
        self,
        *,
        decision: Decision,
        context: BusinessContext,
        arguments: dict[str, Any] | None = None,
    ) -> ToolResult:
        arguments = arguments or {}
        metric = arguments.get("metric")
        business_id = context.business["id"]
        period = arguments.get("period", "all")

        date_filter = self._get_date_filter(period)

        if metric == "sales":
            return self._sales_analytics(business_id, date_filter)
        elif metric == "orders":
            return self._orders_analytics(business_id, date_filter)
        elif metric == "leads":
            return self._leads_analytics(business_id, date_filter)
        elif metric == "content":
            return self._content_analytics(business_id, date_filter)
        elif metric == "overview":
            return self._overview(business_id, date_filter)
        elif metric == "engagement":
            return self._engagement_analytics(business_id)
        else:
            return ToolResult(
                status=ToolStatus.FAILED,
                message="Unsupported analytics metric.",
            )

    def _sales_analytics(self, business_id: int, date_filter: dict) -> ToolResult:
        products = Product.objects.filter(business_id=business_id)
        if date_filter:
            products_in_period = products.filter(**date_filter)
        else:
            products_in_period = products

        orders = Order.objects.filter(business_id=business_id)

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Catalogue and store-order analytics retrieved.",
            data={
                "note": "Orders are store enquiries, not payment confirmations.",
                "total_products": products.count(),
                "active_products": products.filter(status=Product.Status.ACTIVE).count(),
                "draft_products": products.filter(status=Product.Status.DRAFT).count(),
                "new_in_period": products_in_period.count(),
                "open_orders": orders.exclude(
                    status__in=[Order.Status.DELIVERED, Order.Status.CANCELLED]
                ).count(),
                "total_orders": orders.count(),
            },
        )

    def _orders_analytics(self, business_id: int, date_filter: dict) -> ToolResult:
        orders = Order.objects.filter(business_id=business_id)
        if date_filter:
            orders_in_period = orders.filter(**date_filter)
        else:
            orders_in_period = orders

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Store order analytics retrieved.",
            data={
                "note": "Orders are store enquiries, not payment confirmations.",
                "total_orders": orders.count(),
                "new_orders": orders.filter(status=Order.Status.NEW).count(),
                "in_fulfilment": orders.filter(
                    status__in=[
                        Order.Status.CONFIRMED,
                        Order.Status.PACKING,
                        Order.Status.OUT_FOR_DELIVERY,
                    ]
                ).count(),
                "delivered": orders.filter(status=Order.Status.DELIVERED).count(),
                "cancelled": orders.filter(status=Order.Status.CANCELLED).count(),
                "new_in_period": orders_in_period.count(),
            },
        )

    def _engagement_analytics(self, business_id: int) -> ToolResult:
        from django.db.models import Sum

        from apps.social.models import SocialPost

        qs = SocialPost.objects.filter(content__business_id=business_id)
        published = qs.filter(
            publishing_status=SocialPost.PublishingStatus.PUBLISHED
        ).count()
        if published == 0:
            return ToolResult(
                status=ToolStatus.SUCCESS,
                message="No published social posts with metrics yet.",
                data={"metric": "engagement", "published_posts": 0, "available": False},
            )

        totals = qs.aggregate(
            likes=Sum("likes"),
            comments=Sum("comments_count"),
            shares=Sum("shares"),
            reach=Sum("reach"),
        )
        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Engagement totals from social posts.",
            data={
                "metric": "engagement",
                "available": True,
                "published_posts": published,
                "totals": {k: int(v or 0) for k, v in totals.items()},
            },
        )

    def _leads_analytics(self, business_id: int, date_filter: dict) -> ToolResult:
        leads = Lead.objects.filter(business_id=business_id)
        if date_filter:
            leads_in_period = leads.filter(**date_filter)
        else:
            leads_in_period = leads

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Lead analytics retrieved.",
            data={
                "total_leads": leads.count(),
                "new_leads": leads.filter(status=Lead.Status.NEW).count(),
                "qualified_leads": leads.filter(status=Lead.Status.QUALIFIED).count(),
                "converted_leads": leads.filter(status=Lead.Status.CONVERTED).count(),
                "new_in_period": leads_in_period.count(),
            },
        )

    def _content_analytics(self, business_id: int, date_filter: dict) -> ToolResult:
        contents = Content.objects.filter(business_id=business_id)
        if date_filter:
            contents_in_period = contents.filter(**date_filter)
        else:
            contents_in_period = contents

        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Content analytics retrieved.",
            data={
                "total_content": contents.count(),
                "drafts": contents.filter(status=Content.Status.DRAFT).count(),
                "published": contents.filter(status=Content.Status.PUBLISHED).count(),
                "new_in_period": contents_in_period.count(),
            },
        )

    def _overview(self, business_id: int, date_filter: dict) -> ToolResult:
        return ToolResult(
            status=ToolStatus.SUCCESS,
            message="Business overview retrieved.",
            data={
                "products": Product.objects.filter(business_id=business_id).count(),
                "active_products": Product.objects.filter(
                    business_id=business_id, status=Product.Status.ACTIVE
                ).count(),
                "leads": Lead.objects.filter(business_id=business_id).count(),
                "content": Content.objects.filter(business_id=business_id).count(),
                "published_content": Content.objects.filter(
                    business_id=business_id, status=Content.Status.PUBLISHED
                ).count(),
            },
        )

    @staticmethod
    def _get_date_filter(period: str) -> dict:
        now = timezone.now()
        if period == "today":
            return {"created_at__date": now.date()}
        elif period == "week":
            return {"created_at__gte": now - timezone.timedelta(days=7)}
        elif period == "month":
            return {"created_at__gte": now - timezone.timedelta(days=30)}
        return {}
