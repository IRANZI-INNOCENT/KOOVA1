from io import BytesIO
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.businesses.models import Business

from apps.commerce.models import (
    CommercePage,
    Product,
    ProductAIAnalysis,
    ProductImage,
)


class SnapToSellTests(TestCase):
    """Tests for the Kova Snap to Sell workflow."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="StrongPassword123!",
        )

        self.business = Business.objects.create(
            owner=self.user,
            name="Test Boutique",
            description="A small fashion business.",
            industry="Fashion",
        )

        self.client = APIClient()

        self.client.force_authenticate(
            user=self.user,
        )

        self.url = (
            f"/api/commerce/"
            f"{self.business.id}/"
            f"snap-to-sell/"
        )

    @patch(
        "apps.commerce.services.product_service.ProductVisionService.analyze"
    )
    def test_snap_to_sell_creates_product(
        self,
        mock_analyze,
    ):
        mock_analyze.return_value = {
            "name": "Black Jacket",
            "category": "Jackets",
            "short_description": (
                "A black jacket with a clean everyday style."
            ),
            "description": (
                "A black jacket suitable for everyday wear."
            ),
            "seo_title": "Black Jacket",
            "seo_description": (
                "Shop this black jacket."
            ),
            "selling_points": [
                "Black finish",
                "Everyday style",
            ],
            "keywords": [
                "black jacket",
                "fashion",
            ],
            "visual_attributes": {
                "color": "black",
                "type": "jacket",
            },
            "uncertain_attributes": [],
            "ai_summary": (
                "Kova identified a black jacket."
            ),
            "confidence": 0.92,
        }

        image = SimpleUploadedFile(
            "jacket.jpg",
            b"fake-image-data",
            content_type="image/jpeg",
        )

        response = self.client.post(
            self.url,
            {
                "image": image,
                "price": "2500",
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        product = Product.objects.get(
            business=self.business,
        )

        self.assertEqual(
            product.price,
            2500,
        )

        self.assertEqual(
            product.name,
            "Black Jacket",
        )
        self.assertEqual(product.category, "Jackets")
        self.assertEqual(product.color, "black")
        self.assertEqual(product.condition, "New")

        self.assertTrue(
            product.ai_generated,
        )

        self.assertEqual(
            product.status,
            Product.Status.ACTIVE,
        )

        page = CommercePage.objects.get(business=self.business)
        self.assertTrue(page.is_published)
        self.assertEqual(
            response.data["store_path"],
            f"/store/{page.slug}",
        )
        self.assertEqual(
            response.data["product_path"],
            f"/store/{page.slug}/{product.slug}",
        )

        self.assertEqual(
            product.images.count(),
            1,
        )

        self.assertEqual(
            ProductAIAnalysis.objects.count(),
            1,
        )

        mock_analyze.assert_called_once()

    def test_price_is_required(self):
        image = SimpleUploadedFile(
            "jacket.jpg",
            b"fake-image-data",
            content_type="image/jpeg",
        )

        response = self.client.post(
            self.url,
            {
                "image": image,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

    def test_image_is_required(self):
        response = self.client.post(
            self.url,
            {
                "price": "2500",
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

    def test_negative_price_is_rejected(self):
        image = SimpleUploadedFile(
            "jacket.jpg",
            b"fake-image-data",
            content_type="image/jpeg",
        )

        response = self.client.post(
            self.url,
            {
                "image": image,
                "price": "-100",
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            400,
        )

    @patch(
        "apps.commerce.services.product_service.ProductVisionService.analyze"
    )
    def test_optional_name_overrides_ai_name(
        self,
        mock_analyze,
    ):
        mock_analyze.return_value = {
            "name": "AI Name",
            "category": "Jackets",
            "short_description": "",
            "description": "",
            "seo_title": "",
            "seo_description": "",
            "selling_points": [],
            "keywords": [],
            "visual_attributes": {},
            "uncertain_attributes": [],
            "ai_summary": "",
            "confidence": 0.8,
        }

        image = SimpleUploadedFile(
            "jacket.jpg",
            b"fake-image-data",
            content_type="image/jpeg",
        )

        response = self.client.post(
            self.url,
            {
                "image": image,
                "price": "2500",
                "name": "Owner Jacket Name",
                "category": "Outerwear",
                "color": "Red",
                "condition": "Used",
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            201,
        )

        product = Product.objects.get(
            business=self.business,
        )

        self.assertEqual(
            product.name,
            "Owner Jacket Name",
        )
        self.assertEqual(product.category, "Outerwear")
        self.assertEqual(product.color, "Red")
        self.assertEqual(product.condition, "Used")