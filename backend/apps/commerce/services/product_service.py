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
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Any

from django.core.files.uploadedfile import SimpleUploadedFile, UploadedFile
from django.db import close_old_connections, transaction

from apps.businesses.models import Business

from ..models import Product, ProductAIAnalysis, ProductImage
from .business_context import CommerceBusinessContextService
from .product_vision import ProductVisionError, ProductVisionService

logger = logging.getLogger(__name__)


@dataclass
class SnapToSellBatchResult:
    """Outcome of a parallel Snap-to-Sell batch."""

    products: list[Product] = field(default_factory=list)
    errors: list[dict[str, Any]] = field(default_factory=list)


class SnapToSellService:
    """Turn product photos into a reviewable Kova business asset."""

    MAX_IMAGES = 10
    MAX_BATCH_SIZE = 10
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10 MB
    MAX_PARALLEL_VISION_WORKERS = 5

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
            uploads:     1–10 uploaded image files (one product).
            owner_facts: Owner-provided commercial facts.

        Returns:
            The newly created draft Product with images and
            AI analysis history attached.

        Raises:
            ProductVisionError: On validation or AI failure.
        """

        self._validate_uploads(uploads)

        from apps.kova_ai.services.usage import track_ai_usage

        with track_ai_usage("snap_to_sell", business.id):
            business_context = CommerceBusinessContextService.build(
                business,
            )

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

        return self._persist_analyzed_product(
            business=business,
            uploads=uploads,
            owner_facts=owner_facts,
            analysis=analysis,
        )

    def create_batch(
        self,
        *,
        business: Business,
        uploads: list[UploadedFile],
        owner_facts: dict[str, Any],
        per_image_prices: list[str] | None = None,
    ) -> SnapToSellBatchResult:
        """
        Analyze each image in parallel and create one draft product per photo.

        Use ``owner_facts["price"]`` for a shared selling price, or
        ``per_image_prices`` (same order as uploads) for individual prices.
        Currency and other owner fields apply to every product in the batch.
        """

        self._validate_batch_uploads(uploads)

        business_context = CommerceBusinessContextService.build(
            business,
        )

        prepared: list[tuple[int, str, bytes, str]] = []
        for index, upload in enumerate(uploads):
            content_type = (upload.content_type or "image/jpeg").lower()
            prepared.append(
                (index, upload.name, upload.read(), content_type),
            )
            upload.seek(0)

        if per_image_prices is None and not owner_facts.get("price"):
            raise ProductVisionError("Selling price is required.")

        if (
            per_image_prices is not None
            and len(per_image_prices) != len(uploads)
        ):
            raise ProductVisionError(
                "Provide exactly one price for each photo."
            )

        per_image_facts = {
            key: value
            for key, value in owner_facts.items()
            if key
            not in (
                "name",
                "category",
                "brand",
                "material",
                "size",
                "color",
                "condition",
                "price",
            )
        }

        workers = min(
            self.MAX_PARALLEL_VISION_WORKERS,
            len(prepared),
        )
        products_by_index: dict[int, Product] = {}
        errors: list[dict[str, Any]] = []

        def process_one(
            index: int,
            filename: str,
            content: bytes,
            content_type: str,
        ) -> tuple[int, Product | None, dict[str, Any] | None]:
            close_old_connections()
            from apps.kova_ai.services.usage import track_ai_usage

            try:
                with track_ai_usage("snap_to_sell", business.id):
                    item_owner_facts = {
                        **per_image_facts,
                        "price": (
                            per_image_prices[index]
                            if per_image_prices is not None
                            else owner_facts["price"]
                        ),
                    }

                    product = self._create_from_image_bytes(
                        business=business,
                        filename=filename,
                        content=content,
                        content_type=content_type,
                        owner_facts=item_owner_facts,
                        business_context=business_context,
                    )
                    return index, product, None
            except ProductVisionError as exc:
                return index, None, {
                    "index": index,
                    "filename": filename,
                    "detail": str(exc) or "Kova could not analyze this image.",
                }
            except Exception:
                logger.exception(
                    "Snap-to-Sell batch item failed: business_id=%s index=%s",
                    business.pk,
                    index,
                )
                return index, None, {
                    "index": index,
                    "filename": filename,
                    "detail": (
                        "Kova encountered an unexpected error "
                        "while analyzing this image."
                    ),
                }
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = [
                executor.submit(process_one, index, name, data, ctype)
                for index, name, data, ctype in prepared
            ]

            for future in as_completed(futures):
                index, product, error = future.result()
                if product is not None:
                    products_by_index[index] = product
                elif error is not None:
                    errors.append(error)

        errors.sort(key=lambda item: item["index"])
        products = [
            products_by_index[i]
            for i in sorted(products_by_index)
        ]

        if not products:
            first_detail = errors[0]["detail"] if errors else (
                "Kova could not analyze the product images."
            )
            raise ProductVisionError(first_detail)

        return SnapToSellBatchResult(products=products, errors=errors)

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

    def _validate_batch_uploads(
        self,
        uploads: list[UploadedFile],
    ) -> None:
        if not uploads:
            raise ProductVisionError(
                "At least one product image is required."
            )

        if len(uploads) > self.MAX_BATCH_SIZE:
            raise ProductVisionError(
                f"Snap-to-Sell batch supports a maximum of "
                f"{self.MAX_BATCH_SIZE} images."
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

    def _create_from_image_bytes(
        self,
        *,
        business: Business,
        filename: str,
        content: bytes,
        content_type: str,
        owner_facts: dict[str, Any],
        business_context: dict[str, Any],
    ) -> Product:
        image_payload = [(filename, content)]

        analysis = self.vision.analyze(
            images=image_payload,
            owner_facts=owner_facts,
            business_context=business_context,
        )

        if not isinstance(analysis, dict):
            raise ProductVisionError(
                "Product vision returned an invalid response."
            )

        upload = SimpleUploadedFile(
            filename,
            content,
            content_type=content_type or "image/jpeg",
        )

        return self._persist_analyzed_product(
            business=business,
            uploads=[upload],
            owner_facts=owner_facts,
            analysis=analysis,
        )

    @staticmethod
    def _persist_analyzed_product(
        *,
        business: Business,
        uploads: list[UploadedFile],
        owner_facts: dict[str, Any],
        analysis: dict[str, Any],
    ) -> Product:
        from .storefront import publish_product_on_store

        with transaction.atomic():
            product = SnapToSellService._create_product(
                business=business,
                owner_facts=owner_facts,
                analysis=analysis,
            )

            SnapToSellService._save_images(
                product=product,
                uploads=uploads,
                analysis=analysis,
            )

            SnapToSellService._save_analysis_history(
                product=product,
                analysis=analysis,
            )

            publish_product_on_store(product)
            product.refresh_from_db()

        return product

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
