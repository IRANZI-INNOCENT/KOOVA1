"""
Snap-to-Sell service.

Turns product photographs into a reviewable Kova business asset.

The service:
    - validates uploaded images;
    - assembles Business Brain context;
    - calls the product vision AI;
    - persists the product, images, and AI analysis history;
    - enforces the owner-fact / AI-intelligence boundary.

Owner-provided facts win when the owner typed them. When a photo
is analyzed without those facts, Kova fills the category and color
from the image and sets condition to New.
"""

from __future__ import annotations

import logging
from typing import Any

from django.core.files.uploadedfile import UploadedFile
from django.db import transaction

from apps.businesses.models import Business

from ..models import Product, ProductAIAnalysis, ProductImage
from .business_context import CommerceBusinessContextService
from .product_vision import ProductVisionError, ProductVisionService

logger = logging.getLogger(__name__)


class SnapToSellService:
    """Turn product photos into a reviewable Kova business asset."""

    MAX_IMAGES = 5
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB

    def __init__(self, *, vision: ProductVisionService | None = None):
        self.vision = vision or ProductVisionService()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @transaction.atomic
    def create(
        self,
        *,
        business: Business,
        uploads: list[UploadedFile],
        owner_facts: dict[str, Any],
    ) -> Product:
        """
        Analyze product images and create a draft product.

        Args:
            business:    The business that owns the product.
            uploads:     1–5 uploaded image files.
            owner_facts: Owner-provided commercial facts.

        Returns:
            The newly created draft Product with images and
            AI analysis history attached.

        Raises:
            ProductVisionError: On validation or AI failure.
        """

        self._validate_uploads(uploads)

        # Build Business Brain context for the vision prompt.
        business_context = CommerceBusinessContextService.build(
            business,
        )

        # Read image bytes before the vision call.
        # Reset file pointers afterward so they can be saved.
        image_payload: list[tuple[str, bytes]] = []
        for upload in uploads:
            image_payload.append((upload.name, upload.read()))
            upload.seek(0)

        analysis = self.vision.analyze(
            images=image_payload,
            owner_facts=owner_facts,
            business_context=business_context,
        )

        if not isinstance(analysis, dict):
            raise ProductVisionError(
                "Product vision returned an invalid response."
            )

        product = self._create_product(
            business=business,
            owner_facts=owner_facts,
            analysis=analysis,
        )

        self._save_images(
            product=product,
            uploads=uploads,
            analysis=analysis,
        )

        self._save_analysis_history(
            product=product,
            analysis=analysis,
        )

        from .storefront import publish_product_on_store

        publish_product_on_store(product)
        product.refresh_from_db()

        return product

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def _validate_uploads(
        self,
        uploads: list[UploadedFile],
    ) -> None:
        if not uploads:
            raise ProductVisionError(
                "At least one product image is required."
            )

        if len(uploads) > self.MAX_IMAGES:
            raise ProductVisionError(
                f"Snap-to-Sell supports a maximum of "
                f"{self.MAX_IMAGES} images."
            )

        for upload in uploads:
            content_type = (upload.content_type or "").lower()

            if not content_type.startswith("image/"):
                raise ProductVisionError(
                    f"{upload.name} is not a supported image file."
                )

            if upload.size and upload.size > self.MAX_IMAGE_SIZE:
                raise ProductVisionError(
                    f"{upload.name} is larger than the 10 MB image limit."
                )

    # ------------------------------------------------------------------
    # Product creation
    # ------------------------------------------------------------------

    @staticmethod
    def _create_product(
        *,
        business: Business,
        owner_facts: dict[str, Any],
        analysis: dict[str, Any],
    ) -> Product:
        """
        Persist the product.

        Owner-provided name wins over the AI suggestion.
        The vision prompt JSON schema returns ``"name"`` for the
        suggested product name.
        """

        product_name = (
            str(owner_facts.get("name") or "").strip()
            or str(analysis.get("name") or "").strip()
            or "Untitled Product"
        )

        category = (
            str(owner_facts.get("category") or "").strip()
            or str(analysis.get("category") or "").strip()
        )
        color = (
            str(owner_facts.get("color") or "").strip()
            or str(analysis.get("color") or "").strip()
            or ProductVisionService._visible_color(analysis)
        )
        condition = (
            str(owner_facts.get("condition") or "").strip()
            or "New"
        )

        return Product.objects.create(
            business=business,

            # Owner facts, with photo detection when the owner left them blank
            name=product_name[:200],
            category=category[:160],
            price=owner_facts.get("price") or None,
            currency=str(
                owner_facts.get("currency") or "KES"
            ).strip().upper()[:10],
            stock=owner_facts.get("stock") or None,
            sku=str(owner_facts.get("sku") or "")[:100],
            brand=str(
                owner_facts.get("brand") or ""
            ).strip()[:160],
            material=str(
                owner_facts.get("material") or ""
            ).strip()[:160],
            size=str(
                owner_facts.get("size") or ""
            ).strip()[:160],
            color=color[:160],
            condition=condition[:100],

            # Kova intelligence
            short_description=(
                analysis.get("short_description") or ""
            ),
            description=(
                analysis.get("description") or ""
            ),
            seo_title=(
                analysis.get("seo_title") or ""
            ),
            seo_description=(
                analysis.get("seo_description") or ""
            ),
            selling_points=(
                analysis.get("selling_points") or []
            ),
            keywords=(
                analysis.get("keywords") or []
            ),
            visual_attributes=(
                analysis.get("visual_attributes") or {}
            ),
            uncertain_attributes=(
                analysis.get("uncertain_attributes") or []
            ),
            ai_summary=(
                analysis.get("ai_summary") or ""
            ),
            ai_confidence=analysis.get("confidence"),
            ai_generated=True,

            status=Product.Status.DRAFT,
        )

    # ------------------------------------------------------------------
    # Image storage
    # ------------------------------------------------------------------

    @staticmethod
    def _save_images(
        *,
        product: Product,
        uploads: list[UploadedFile],
        analysis: dict[str, Any],
    ) -> None:
        """Save original product images."""

        alt_text = (
            analysis.get("ai_summary") or product.name
        )[:300]

        for index, upload in enumerate(uploads):
            upload.seek(0)

            ProductImage.objects.create(
                product=product,
                image=upload,
                alt_text=alt_text,
                display_order=index,
                is_primary=(index == 0),
            )

    # ------------------------------------------------------------------
    # AI analysis history
    # ------------------------------------------------------------------

    @staticmethod
    def _save_analysis_history(
        *,
        product: Product,
        analysis: dict[str, Any],
    ) -> None:
        """Preserve the AI analysis as historical record."""

        ProductAIAnalysis.objects.create(
            product=product,
            model=analysis.get("model", "Kova Product Vision"),
            result=analysis,
            confidence=analysis.get("confidence"),
        )
