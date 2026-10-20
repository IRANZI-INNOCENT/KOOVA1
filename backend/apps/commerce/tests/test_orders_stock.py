from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.businesses.models import Business
from apps.commerce.models import Order, Product
from apps.commerce.services.orders import OrderUpdateError, apply_order_update


class OrderStockTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(
            email="owner@example.com",
            password="pass12345",
        )
        self.business = Business.objects.create(
            owner=user,
            name="Test Shop",
        )
        self.product = Product.objects.create(
            business=self.business,
            name="Sofa",
            slug="sofa",
            price=Decimal("1000.00"),
            stock=5,
            status=Product.Status.ACTIVE,
        )

    def test_confirm_decrements_stock(self):
        order = Order.objects.create(
            business=self.business,
            product=self.product,
            quantity=2,
            status=Order.Status.NEW,
        )
        apply_order_update(order, data={"status": Order.Status.CONFIRMED})
        self.product.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(self.product.stock, 3)
        self.assertTrue(order.stock_adjusted)

    def test_cancel_restores_stock(self):
        order = Order.objects.create(
            business=self.business,
            product=self.product,
            quantity=2,
            status=Order.Status.NEW,
        )
        apply_order_update(order, data={"status": Order.Status.CONFIRMED})
        apply_order_update(order, data={"status": Order.Status.CANCELLED})
        self.product.refresh_from_db()
        order.refresh_from_db()
        self.assertEqual(self.product.stock, 5)
        self.assertFalse(order.stock_adjusted)

    def test_confirm_blocked_when_insufficient(self):
        order = Order.objects.create(
            business=self.business,
            product=self.product,
            quantity=9,
            status=Order.Status.NEW,
        )
        with self.assertRaises(OrderUpdateError):
            apply_order_update(order, data={"status": Order.Status.CONFIRMED})
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)

    def test_delivered_sets_review_ask(self):
        order = Order.objects.create(
            business=self.business,
            product=self.product,
            quantity=1,
            customer_name="Amina",
            status=Order.Status.NEW,
        )
        apply_order_update(order, data={"status": Order.Status.CONFIRMED})
        apply_order_update(order, data={"status": Order.Status.DELIVERED})
        order.refresh_from_db()
        self.assertTrue(order.review_ask_draft)
        self.assertIn("Amina", order.review_ask_draft)
