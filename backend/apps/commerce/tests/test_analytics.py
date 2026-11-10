from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.businesses.models import Business
from apps.commerce.models import BusinessExpense, Order, Product
from apps.commerce.services.analytics import build_business_analytics
from apps.leads.models import Lead


class BusinessAnalyticsTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(
            email="analytics@test.com",
            password="pass12345",
        )
        self.business = Business.objects.create(owner=user, name="Stats Shop")
        self.product = Product.objects.create(
            business=self.business,
            name="Chair",
            price=Decimal("500"),
            stock=1,
            status=Product.Status.ACTIVE,
        )

    def test_orders_and_expenses_in_period(self):
        Order.objects.create(
            business=self.business,
            product=self.product,
            status=Order.Status.NEW,
        )
        Order.objects.create(
            business=self.business,
            status=Order.Status.CANCELLED,
        )
        today = timezone.localdate()
        BusinessExpense.objects.create(
            business=self.business,
            amount=Decimal("200"),
            category="rider",
            spent_on=today,
        )
        payload = build_business_analytics(self.business.id, period="7d")
        self.assertEqual(payload["kpis"]["orders_in_period"]["value"], 1)
        self.assertEqual(payload["availability"]["revenue"], False)
        self.assertAlmostEqual(payload["kpis"]["expenses_total"]["value"], 200.0)
        self.assertEqual(len(payload["products"]["low_stock"]), 1)

    def test_lead_conversion_rate(self):
        Lead.objects.create(
            business=self.business,
            source="store",
            interest="Sofa",
            status=Lead.Status.CONVERTED,
        )
        Lead.objects.create(
            business=self.business,
            source="ig",
            interest="Table",
            status=Lead.Status.NEW,
        )
        payload = build_business_analytics(self.business.id, period="30d")
        self.assertEqual(payload["leads"]["conversion_rate_pct"], 50.0)

    def test_previous_period_comparison(self):
        old = timezone.now() - timedelta(days=10)
        order = Order.objects.create(
            business=self.business,
            status=Order.Status.CONFIRMED,
        )
        Order.objects.filter(pk=order.pk).update(created_at=old)
        recent = Order.objects.create(
            business=self.business,
            status=Order.Status.CONFIRMED,
        )
        self.assertIsNotNone(recent.pk)
        payload = build_business_analytics(self.business.id, period="7d")
        self.assertEqual(payload["kpis"]["orders_in_period"]["value"], 1)
        self.assertEqual(payload["kpis"]["orders_in_period"]["previous"], 1)
