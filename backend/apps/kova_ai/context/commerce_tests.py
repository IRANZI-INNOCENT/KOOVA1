from django.test import TestCase

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.commerce.models import CommercePage, Product

from .engine import ContextEngine
from .types import ContextTask


class CommerceContextTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="commerce-context@example.com",
            password="StrongPassword123!",
        )
        self.business = Business.objects.create(
            owner=self.user,
            name="Context Shop",
        )

    def test_commerce_context_contains_products_and_page(self):
        product = Product.objects.create(
            business=self.business,
            name="Black Jacket",
            status=Product.Status.ACTIVE,
            price="2500.00",
        )
        CommercePage.objects.create(
            business=self.business,
            slug="context-shop",
            title="Context Shop",
        )

        context = ContextEngine().build(
            business_id=self.business.id,
            task=ContextTask.COMMERCE,
        )

        self.assertEqual(context.products[0]["id"], product.id)
        self.assertEqual(context.products[0]["price"], "2500.00")
        self.assertEqual(context.commerce_page["slug"], "context-shop")
