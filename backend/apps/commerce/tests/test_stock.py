from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.businesses.models import Business
from apps.commerce.models import Product, ProductStockAdjustment


class ProductStockTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="stock@test.com",
            password="pass12345",
        )
        self.business = Business.objects.create(
            owner=self.user,
            name="Stock Shop",
        )
        self.product = Product.objects.create(
            business=self.business,
            name="Mug",
            slug="mug",
            price=Decimal("500"),
            stock=4,
            status=Product.Status.ACTIVE,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_stock_post_creates_audit_row(self):
        url = f"/api/commerce/{self.business.id}/products/{self.product.id}/stock/"
        response = self.client.post(url, {"stock": 10, "reason": "restock"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 10)
        row = ProductStockAdjustment.objects.filter(product=self.product).first()
        self.assertIsNotNone(row)
        self.assertEqual(row.previous_stock, 4)
        self.assertEqual(row.new_stock, 10)
