from decimal import Decimal

from django.test import TestCase

from apps.businesses.models import Business

from ..models import CommercePage, Product, ProductImage


class CommerceModelTests(TestCase):
    """Test core Commerce model behavior."""

    def setUp(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()

        self.user = User.objects.create_user(
            email="model@example.com",
            password="StrongPassword123!",
        )

        self.business = Business.objects.create(
            owner=self.user,
            name="Test Business",
        )

    def test_product_slug_is_generated(self):
        product = Product.objects.create(
            business=self.business,
            name="Leather Hand Bag",
        )

        self.assertEqual(
            product.slug,
            "leather-hand-bag",
        )

    def test_product_slug_is_unique_within_business(self):
        first = Product.objects.create(
            business=self.business,
            name="Leather Bag",
        )

        second = Product.objects.create(
            business=self.business,
            name="Leather Bag",
        )

        self.assertEqual(first.slug, "leather-bag")
        self.assertEqual(second.slug, "leather-bag-2")

    def test_product_defaults(self):
        product = Product.objects.create(
            business=self.business,
            name="Test Product",
        )

        self.assertEqual(
            product.status,
            Product.Status.DRAFT,
        )

        self.assertEqual(
            product.currency,
            "KES",
        )

        self.assertEqual(
            product.selling_points,
            [],
        )

        self.assertEqual(
            product.keywords,
            [],
        )

    def test_commerce_page_belongs_to_business(self):
        page = CommercePage.objects.get(
            business=self.business,
        )

        self.assertEqual(
            page.business,
            self.business,
        )

    def test_only_one_primary_image(self):
        product = Product.objects.create(
            business=self.business,
            name="Test Product",
        )

        first = ProductImage.objects.create(
            product=product,
            image="commerce/products/test1.jpg",
            is_primary=True,
        )

        second = ProductImage.objects.create(
            product=product,
            image="commerce/products/test2.jpg",
            is_primary=True,
        )

        first.refresh_from_db()

        self.assertFalse(first.is_primary)
        self.assertTrue(second.is_primary)