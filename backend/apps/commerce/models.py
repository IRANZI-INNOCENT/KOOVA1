"""
Kova Commerce models.

Commerce is part of the Business Asset layer.

A product is not just a catalog record. It is an authoritative business
asset that Kova can use for content creation, social selling, customer
conversations, commerce pages, analytics and future AI operations.

The model deliberately separates:

1. Owner-provided facts
2. Kova-generated intelligence

Kova-generated information must never silently replace authoritative
business facts.
"""

from __future__ import annotations

from django.db import models
from django.utils.text import slugify

from apps.businesses.models import Business


class CommercePage(models.Model):
    """
    Public commerce presence for a business.

    Every business can have one Commerce Page. The page provides the
    public-facing storefront around the business and its products.
    """

    business = models.OneToOneField(
        Business,
        on_delete=models.CASCADE,
        related_name="commerce_page",
    )

    slug = models.SlugField(
        max_length=160,
        unique=True,
    )

    title = models.CharField(
        max_length=200,
        blank=True,
    )

    tagline = models.CharField(
        max_length=300,
        blank=True,
    )

    description = models.TextField(
        blank=True,
    )

    whatsapp = models.CharField(
        max_length=30,
        blank=True,
    )

    email = models.EmailField(
        blank=True,
    )

    phone = models.CharField(
        max_length=30,
        blank=True,
    )

    location = models.CharField(
        max_length=200,
        blank=True,
    )

    is_published = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-updated_at"]

    def save(self, *args, **kwargs):
        """
        Generate a storefront slug when one has not been supplied.
        """

        if not self.slug:
            self.slug = slugify(
                self.business.name
            ) or f"business-{self.business_id}"

        super().save(*args, **kwargs)

    def __str__(self):
        return self.title or self.business.name


class Product(models.Model):
    """
    A first-class business asset.

    Owner-provided fields represent facts supplied by the business owner.

    AI-generated fields represent Kova's understanding and marketing
    intelligence derived from product images and owner-provided information.
    """

    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    # ------------------------------------------------------------------
    # BUSINESS OWNERSHIP
    # ------------------------------------------------------------------

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="products",
    )

    # ------------------------------------------------------------------
    # BASIC PRODUCT IDENTITY
    # ------------------------------------------------------------------

    name = models.CharField(
        max_length=200,
    )

    slug = models.SlugField(
        max_length=220,
    )

    sku = models.CharField(
        max_length=100,
        blank=True,
    )

    category = models.CharField(
        max_length=160,
        blank=True,
    )

    # ------------------------------------------------------------------
    # OWNER-PROVIDED COMMERCIAL FACTS
    # ------------------------------------------------------------------

    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
    )

    currency = models.CharField(
        max_length=10,
        default="KES",
    )

    stock = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    brand = models.CharField(
        max_length=160,
        blank=True,
    )

    material = models.CharField(
        max_length=160,
        blank=True,
    )

    size = models.CharField(
        max_length=160,
        blank=True,
    )

    color = models.CharField(
        max_length=160,
        blank=True,
    )

    condition = models.CharField(
        max_length=100,
        blank=True,
    )

    # ------------------------------------------------------------------
    # KOVA AI PRODUCT INTELLIGENCE
    # ------------------------------------------------------------------

    short_description = models.TextField(
        blank=True,
    )

    description = models.TextField(
        blank=True,
    )

    seo_title = models.CharField(
        max_length=220,
        blank=True,
    )

    seo_description = models.TextField(
        blank=True,
    )

    selling_points = models.JSONField(
        default=list,
        blank=True,
    )

    keywords = models.JSONField(
        default=list,
        blank=True,
    )

    visual_attributes = models.JSONField(
        default=dict,
        blank=True,
    )

    uncertain_attributes = models.JSONField(
        default=list,
        blank=True,
    )

    ai_summary = models.TextField(
        blank=True,
    )

    ai_confidence = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
    )

    ai_generated = models.BooleanField(
        default=False,
    )

    # ------------------------------------------------------------------
    # PRODUCT LIFECYCLE
    # ------------------------------------------------------------------

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["business", "slug"],
                name="unique_product_slug_per_business",
            ),
        ]

    def save(self, *args, **kwargs):
        """
        Generate a business-scoped slug.

        Product slugs only need to be unique within a business because
        the public Commerce Page already identifies the business.
        """

        if not self.slug:
            self.slug = self._generate_slug()

        elif (
            Product.objects
            .filter(
                business=self.business,
                slug=self.slug,
            )
            .exclude(pk=self.pk)
            .exists()
        ):
            self.slug = self._generate_slug()

        super().save(*args, **kwargs)

    def _generate_slug(self) -> str:
        """
        Generate a unique slug for this product within its business.
        """

        base_slug = slugify(
            self.name
        ) or "product"

        slug = base_slug
        counter = 2

        while (
            Product.objects
            .filter(
                business=self.business,
                slug=slug,
            )
            .exclude(pk=self.pk)
            .exists()
        ):
            slug = f"{base_slug}-{counter}"
            counter += 1

        return slug

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    """
    Image belonging to a Product.

    Product images are the primary input for Snap to Sell and Kova's
    multimodal product understanding.
    """

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="images",
    )

    image = models.ImageField(
        upload_to="commerce/products/%Y/%m/",
    )

    alt_text = models.CharField(
        max_length=300,
        blank=True,
    )

    display_order = models.PositiveIntegerField(
        default=0,
    )

    is_primary = models.BooleanField(
        default=False,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = [
            "display_order",
            "created_at",
        ]

    def save(self, *args, **kwargs):
        """
        Ensure that a product has at most one primary image.
        """

        if self.is_primary:
            (
                ProductImage.objects
                .filter(
                    product=self.product,
                    is_primary=True,
                )
                .exclude(pk=self.pk)
                .update(is_primary=False)
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} image"



class ProductAIAnalysis(models.Model):
    """
    Store a historical Kova AI analysis of a product.

    Analysis history is kept separately from Product so Kova can
    re-analyze a product without overwriting previous intelligence.
    """

    product = models.ForeignKey(
        Product,
        on_delete=models.CASCADE,
        related_name="ai_analyses",
    )

    model = models.CharField(
        max_length=150,
        help_text="AI model used for the analysis.",
    )

    result = models.JSONField(
        default=dict,
        help_text="Structured product analysis returned by Kova.",
    )

    confidence = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.product.name} - {self.model}"


class Order(models.Model):
    """
    A customer order started from the public store.

    The conversation continues on WhatsApp. This record is what the
    business sees in the workspace, the morning brief, and analytics.
    """

    class Status(models.TextChoices):
        NEW = "new", "New"
        CONFIRMED = "confirmed", "Confirmed"
        FULFILLED = "fulfilled", "Fulfilled"
        CANCELLED = "cancelled", "Cancelled"

    class Source(models.TextChoices):
        STORE = "store", "Store"
        WHATSAPP = "whatsapp", "WhatsApp"
        MANUAL = "manual", "Manual"

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    customer_name = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    note = models.TextField(blank=True)
    quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.NEW,
    )
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.STORE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        product_name = self.product.name if self.product_id else "Order"
        return f"{product_name} — {self.get_status_display()}"