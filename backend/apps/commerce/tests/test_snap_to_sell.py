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

        self.batch_url = (
            f"/api/commerce/"
            f"{self.business.id}/"
            f"snap-to-sell/batch/"
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

    @patch(
        "apps.commerce.services.product_service.ProductVisionService.analyze"
    )
    def test_snap_to_sell_rejects_more_than_ten_images(
        self,
        mock_analyze,
    ):
        mock_analyze.return_value = {
            "name": "Item",
            "category": "General",
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

        files = [
            SimpleUploadedFile(
                f"item-{index}.jpg",
                b"fake-image-data",
                content_type="image/jpeg",
            )
            for index in range(11)
        ]

        response = self.client.post(
            self.url,
            {
                "images": files,
                "price": "100",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 502)
        self.assertIn("maximum of 10", response.data["detail"])
        mock_analyze.assert_not_called()

    @patch(
        "apps.commerce.services.product_service.ProductVisionService.analyze"
    )
    def test_snap_to_sell_batch_creates_products_in_parallel(
        self,
        mock_analyze,
    ):
        names = ["Red Bag", "Blue Shoes", "Green Hat"]

        def analyze_side_effect(*, images, owner_facts, business_context):
            filename = images[0][0]
            index = int(filename.split("-")[1].split(".")[0])
            return {
                "name": names[index],
                "category": "Fashion",
                "short_description": "",
                "description": "",
                "seo_title": "",
                "seo_description": "",
                "selling_points": [],
                "keywords": [],
                "visual_attributes": {"color": "mixed"},
                "uncertain_attributes": [],
                "ai_summary": "",
                "confidence": 0.9,
            }

        mock_analyze.side_effect = analyze_side_effect

        files = [
            SimpleUploadedFile(
                f"item-{index}.jpg",
                b"fake-image-data",
                content_type="image/jpeg",
            )
            for index in range(3)
        ]

        response = self.client.post(
            self.batch_url,
            {
                "images": files,
                "price": "1500",
                "currency": "KES",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["created_count"], 3)
        self.assertEqual(len(response.data["products"]), 3)
        self.assertEqual(response.data["errors"], [])

        self.assertEqual(
            Product.objects.filter(business=self.business).count(),
            3,
        )

        created_names = sorted(
            Product.objects.filter(
                business=self.business,
            ).values_list("name", flat=True),
        )
        self.assertEqual(created_names, sorted(names))
        self.assertEqual(mock_analyze.call_count, 3)

    @patch(
        "apps.commerce.services.product_service.ProductVisionService.analyze"
    )
    def test_snap_to_sell_batch_accepts_per_image_prices(
        self,
        mock_analyze,
    ):
        mock_analyze.return_value = {
            "name": "Batch Item",
            "category": "General",
            "short_description": "",
            "description": "",
            "seo_title": "",
            "seo_description": "",
            "selling_points": [],
            "keywords": [],
            "visual_attributes": {},
            "uncertain_attributes": [],
            "ai_summary": "",
            "confidence": 0.85,
        }

        files = [
            SimpleUploadedFile(
                f"item-{index}.jpg",
                b"fake-image-data",
                content_type="image/jpeg",
            )
            for index in range(2)
        ]

        response = self.client.post(
            self.batch_url,
            {
                "images": files,
                "prices": '["1000", "2500"]',
                "currency": "KES",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, 201)

        prices = sorted(
            Product.objects.filter(
                business=self.business,
            ).values_list("price", flat=True),
        )
        self.assertEqual(prices, [1000, 2500])