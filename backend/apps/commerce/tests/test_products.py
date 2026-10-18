from decimal import Decimal
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.commerce.models import CommercePage, Product


class CommerceAPITests(APITestCase):
    """Cover ownership, product CRUD, Snap to Sell and storefront APIs."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="StrongPassword123!",
            first_name="Owner",
            last_name="User",
        )
        self.other = User.objects.create_user(
            email="other@example.com",
            password="StrongPassword123!",
        )
        self.business = Business.objects.create(
            owner=self.user,
            name="Kova Boutique",
            description="Affordable fashion.",
        )
        # Provisioning signal creates a CommercePage automatically.
        # Grab it so tests can use the existing page.
        self.commerce_page = CommercePage.objects.get(
            business=self.business,
        )
        self.client.force_authenticate(self.user)

    # ------------------------------------------------------------------
    # Product listing
    # ------------------------------------------------------------------

    def test_polish_rewrites_the_public_listing(self):
        product = Product.objects.create(
            business=self.business,
            name="Sofa",
            price=Decimal("17500.00"),
            currency="KES",
            stock=2,
            sku="SOFA-1",
            status=Product.Status.ACTIVE,
        )

        with patch(
            "apps.commerce.services.product_polish.ProductVisionService"
        ) as vision:
            vision.return_value.polish.return_value = {
                "name": "Rust Orange Tufted Sectional Sofa",
                "category": "Sectional sofas",
                "color": "Rust orange",
                "material": "Fabric",
                "short_description": "A rust orange sectional with a chaise.",
                "description": "The sofa is rust orange and tufted.",
                "seo_title": "Rust Orange Sectional Sofa",
                "seo_description": "Shop a rust orange tufted sectional sofa.",
                "selling_points": ["Tufted back", "Chaise included"],
                "keywords": ["sectional sofa"],
                "visual_attributes": {"color": "rust orange"},
                "uncertain_attributes": [],
                "ai_summary": "Named the color and shape from the photo.",
                "alt_text": "Rust orange tufted sectional sofa",
                "confidence": 0.86,
            }
            response = self.client.post(
                f"/api/commerce/{self.business.id}/products/{product.id}/polish/",
            )

        self.assertEqual(response.status_code, 200)
        product.refresh_from_db()
        self.assertEqual(product.name, "Rust Orange Tufted Sectional Sofa")
        self.assertEqual(product.color, "Rust orange")
        self.assertEqual(product.material, "Fabric")
        self.assertIn("chaise", product.short_description)
        self.assertEqual(product.price, Decimal("17500.00"))
        self.assertEqual(product.stock, 2)
        self.assertEqual(product.sku, "SOFA-1")

    def test_polish_keeps_an_owner_color(self):
        product = Product.objects.create(
            business=self.business,
            name="Sofa",
            color="Navy",
            price=Decimal("1000.00"),
        )

        with patch(
            "apps.commerce.services.product_polish.ProductVisionService"
        ) as vision:
            vision.return_value.polish.return_value = {
                "name": "Sofa",
                "category": "Sofas",
                "color": "Rust orange",
                "material": "",
                "short_description": "A navy sofa.",
                "description": "A navy sofa for the living room.",
                "seo_title": "Navy Sofa",
                "seo_description": "Shop a navy sofa.",
                "selling_points": ["Navy upholstery"],
                "keywords": ["sofa"],
                "visual_attributes": {},
                "uncertain_attributes": [],
                "ai_summary": "Kept the owner color.",
                "alt_text": "",
                "confidence": 0.7,
            }
            response = self.client.post(
                f"/api/commerce/{self.business.id}/products/{product.id}/polish/",
            )

        self.assertEqual(response.status_code, 200)
        product.refresh_from_db()
        self.assertEqual(product.color, "Navy")
        self.assertEqual(product.price, Decimal("1000.00"))

    def test_owner_can_list_products(self):
        Product.objects.create(
            business=self.business,
            name="Jacket",
        )
        response = self.client.get(
            f"/api/commerce/{self.business.id}/products/",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_other_owner_cannot_access_products(self):
        self.client.force_authenticate(self.other)
        response = self.client.get(
            f"/api/commerce/{self.business.id}/products/",
        )
        self.assertEqual(response.status_code, 403)

    # ------------------------------------------------------------------
    # Snap to Sell
    # ------------------------------------------------------------------

    def test_snap_to_sell_creates_ai_draft(self):
        fake_image = SimpleUploadedFile(
            "jacket.jpg",
            b"fake-image-content",
            content_type="image/jpeg",
        )
        analysis = {
            "name": "Black Denim Jacket",
            "category": "Jackets",
            "short_description": "A black denim jacket.",
            "description": "A versatile black denim jacket.",
            "seo_title": "Black Denim Jacket",
            "seo_description": "Shop a black denim jacket.",
            "selling_points": ["Classic denim look"],
            "keywords": ["black denim jacket"],
            "visual_attributes": {"color": "black"},
            "uncertain_attributes": ["material composition"],
            "ai_summary": "Black denim-style jacket.",
            "confidence": 0.93,
        }

        with patch(
            "apps.commerce.services.product_service.ProductVisionService"
        ) as vision_cls:
            vision_cls.return_value.analyze.return_value = analysis

            response = self.client.post(
                f"/api/commerce/{self.business.id}/snap-to-sell/",
                {
                    "images": fake_image,
                    "price": "2500",
                    "currency": "KES",
                },
                format="multipart",
            )

        self.assertEqual(response.status_code, 201)
        product = Product.objects.get(name="Black Denim Jacket")
        self.assertEqual(product.status, Product.Status.ACTIVE)
        self.commerce_page.refresh_from_db()
        self.assertTrue(self.commerce_page.is_published)
        self.assertEqual(
            response.data["product_path"],
            f"/store/{self.commerce_page.slug}/{product.slug}",
        )
        self.assertTrue(product.ai_generated)
        self.assertEqual(product.ai_confidence, Decimal("0.93"))
        self.assertEqual(product.images.count(), 1)
        self.assertTrue(product.ai_analyses.exists())

    def test_snap_to_sell_requires_price(self):
        fake_image = SimpleUploadedFile(
            "jacket.jpg",
            b"fake-image-content",
            content_type="image/jpeg",
        )
        response = self.client.post(
            f"/api/commerce/{self.business.id}/snap-to-sell/",
            {"images": fake_image},
            format="multipart",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("price", response.data["detail"].lower())

    def test_snap_to_sell_owner_name_wins(self):
        """Owner-provided name takes precedence over AI suggestion."""

        fake_image = SimpleUploadedFile(
            "jacket.jpg",
            b"fake-image-content",
            content_type="image/jpeg",
        )
        analysis = {
            "name": "AI Suggested Name",
            "short_description": "Desc.",
            "description": "Description.",
            "seo_title": "SEO",
            "seo_description": "SEO desc.",
            "selling_points": [],
            "keywords": [],
            "visual_attributes": {},
            "uncertain_attributes": [],
            "ai_summary": "Summary.",
            "confidence": 0.8,
        }

        with patch(
            "apps.commerce.services.product_service.ProductVisionService"
        ) as vision_cls:
            vision_cls.return_value.analyze.return_value = analysis

            response = self.client.post(
                f"/api/commerce/{self.business.id}/snap-to-sell/",
                {
                    "images": fake_image,
                    "price": "1000",
                    "name": "My Custom Name",
                },
                format="multipart",
            )

        self.assertEqual(response.status_code, 201)
        product = Product.objects.get(name="My Custom Name")
        self.assertEqual(product.name, "My Custom Name")

    # ------------------------------------------------------------------
    # Commerce Page
    # ------------------------------------------------------------------

    def test_commerce_page_is_created(self):
        response = self.client.get(
            f"/api/commerce/{self.business.id}/page/",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["business_name"],
            "Kova Boutique",
        )

    def test_commerce_page_publish_flow(self):
        """Verify the publish/unpublish toggle."""
        page = self.commerce_page
        self.assertFalse(page.is_published)

        response = self.client.post(
            f"/api/commerce/{self.business.id}/page/publish/",
            {"is_published": True},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        page.refresh_from_db()
        self.assertTrue(page.is_published)

        response = self.client.post(
            f"/api/commerce/{self.business.id}/page/publish/",
            {"is_published": False},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        page.refresh_from_db()
        self.assertFalse(page.is_published)

    def test_commerce_page_branding_update(self):
        """Owners can set colors, layout, sections, and slug."""
        response = self.client.patch(
            f"/api/commerce/{self.business.id}/page/",
            {
                "primary_color": "#0A5C3A",
                "secondary_color": "#1A1A2E",
                "accent_color": "#E8A06A",
                "layout_preset": "whatsapp_first",
                "font_preset": "modern",
                "show_hero": True,
                "show_featured": True,
                "show_about": False,
                "slug": "kova-branded-shop",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["primary_color"], "#0A5C3A")
        self.assertEqual(response.data["secondary_color"], "#1A1A2E")
        self.assertEqual(response.data["accent_color"], "#E8A06A")
        self.assertEqual(response.data["layout_preset"], "whatsapp_first")
        self.assertEqual(response.data["font_preset"], "modern")
        self.assertTrue(response.data["show_featured"])
        self.assertFalse(response.data["show_about"])
        self.assertEqual(response.data["slug"], "kova-branded-shop")

        page = self.commerce_page
        page.is_published = True
        page.save(update_fields=["is_published"])

        public = self.client.get("/api/commerce/public/kova-branded-shop/")
        self.assertEqual(public.status_code, 200)
        self.assertEqual(public.data["page"]["primary_color"], "#0A5C3A")
        self.assertEqual(public.data["page"]["layout_preset"], "whatsapp_first")

    # ------------------------------------------------------------------
    # Public storefront
    # ------------------------------------------------------------------

    def test_public_page_requires_publish(self):
        page = self.commerce_page
        slug = page.slug

        response = self.client.get(
            f"/api/commerce/public/{slug}/",
        )
        self.assertEqual(response.status_code, 404)

        page.is_published = True
        page.save(update_fields=["is_published"])

        Product.objects.create(
            business=self.business,
            name="Active Product",
            status=Product.Status.ACTIVE,
        )

        response = self.client.get(
            f"/api/commerce/public/{slug}/",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["products"]), 1)

    def test_public_page_only_shows_active_products(self):
        """Draft and archived products should not appear on the public storefront."""
        page = self.commerce_page
        page.is_published = True
        page.save(update_fields=["is_published"])

        Product.objects.create(
            business=self.business,
            name="Active Item",
            status=Product.Status.ACTIVE,
        )
        Product.objects.create(
            business=self.business,
            name="Draft Item",
            status=Product.Status.DRAFT,
        )
        Product.objects.create(
            business=self.business,
            name="Archived Item",
            status=Product.Status.ARCHIVED,
        )

        response = self.client.get(
            f"/api/commerce/public/{page.slug}/",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["products"]), 1)
        self.assertEqual(
            response.data["products"][0]["name"],
            "Active Item",
        )

    def test_adding_a_product_publishes_store_and_product_page(self):
        response = self.client.post(
            f"/api/commerce/{self.business.id}/products/",
            {
                "name": "Leather Bag",
                "price": "4500.00",
                "category": "Bags",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)

        self.commerce_page.refresh_from_db()
        self.assertTrue(self.commerce_page.is_published)

        product = Product.objects.get(name="Leather Bag")
        self.assertEqual(product.status, Product.Status.ACTIVE)

        public_product = self.client.get(
            f"/api/commerce/public/{self.commerce_page.slug}/products/{product.slug}/",
        )
        self.assertEqual(public_product.status_code, 200)
        self.assertEqual(public_product.data["product"]["name"], "Leather Bag")

        catalog = self.client.get(
            f"/api/commerce/public/{self.commerce_page.slug}/",
        )
        self.assertEqual(catalog.status_code, 200)
        self.assertEqual(len(catalog.data["products"]), 1)

    # ------------------------------------------------------------------
    # Product CRUD
    # ------------------------------------------------------------------

    def test_product_create_and_update(self):
        """Owner can create and patch a product."""
        response = self.client.post(
            f"/api/commerce/{self.business.id}/products/",
            {
                "name": "Leather Bag",
                "price": "4500.00",
                "category": "Bags",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        product_id = response.data["id"]

        response = self.client.patch(
            f"/api/commerce/{self.business.id}/products/{product_id}/",
            {"price": "5000.00"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["price"], "5000.00")

    def test_product_delete(self):
        product = Product.objects.create(
            business=self.business,
            name="Old Product",
        )
        response = self.client.delete(
            f"/api/commerce/{self.business.id}/products/{product.id}/",
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Product.objects.filter(id=product.id).exists())
