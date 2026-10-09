from typing import Any

from django.db.models import Model

from apps.business_brain.models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessMarketBrief,
    BusinessPolicy,
    BusinessProfile,
)
from apps.businesses.models import Business
from apps.commerce.models import CommercePage, Product

from .definitions import ContextRequirement, TASK_DEFINITIONS
from .types import BusinessContext, ContextTask


class ContextEngine:
    """
    Build task-aware Business Brain context.

    The engine deliberately assembles context from the underlying business
    entities instead of creating one giant BusinessBrain database table.
    """

    def build(
        self,
        *,
        business_id: int,
        task: ContextTask = ContextTask.GENERAL,
        task_context: dict[str, Any] | None = None,
    ) -> BusinessContext:
        business = Business.objects.get(id=business_id)
        definition = TASK_DEFINITIONS[task]

        return BusinessContext(
            business=self._serialize_business(business),
            profile=self._get_brain(
                BusinessProfile,
                business,
                definition,
                ContextRequirement.PROFILE,
            ),
            audience=self._get_brain(
                BusinessAudience,
                business,
                definition,
                ContextRequirement.AUDIENCE,
            ),
            brand=self._get_brain(
                BusinessBrand,
                business,
                definition,
                ContextRequirement.BRAND,
            ),
            goals=self._get_brain(
                BusinessGoal,
                business,
                definition,
                ContextRequirement.GOALS,
            ),
            policy=self._get_brain(
                BusinessPolicy,
                business,
                definition,
                ContextRequirement.POLICY,
            ),
            market=self._get_market(business, definition),
            products=self._get_products(business, definition),
            commerce_page=self._get_commerce_page(business, definition),
            task=task,
            task_context=task_context,
        )

    @staticmethod
    def _requires(
        definition: Any,
        requirement: ContextRequirement,
    ) -> bool:
        return requirement in definition.requirements

    @classmethod
    def _get_brain(
        cls,
        model: type[Model],
        business: Business,
        definition: Any,
        requirement: ContextRequirement,
    ):
        if not cls._requires(definition, requirement):
            return None

        instance = model.objects.filter(
            business=business
        ).first()

        return cls._serialize_optional(instance)

    @classmethod
    def _get_market(cls, business: Business, definition: Any):
        if not cls._requires(definition, ContextRequirement.MARKET):
            return None

        brief = BusinessMarketBrief.objects.filter(
            business=business,
            kept=True,
        ).first()
        if brief is None:
            return None

        return {
            "summary": brief.summary,
            "competitors": brief.competitors,
            "gap": brief.gap,
            "positioning": brief.positioning,
            "sources": brief.sources,
        }

    @classmethod
    def _get_products(
        cls,
        business: Business,
        definition: Any,
    ) -> list[dict[str, Any]]:
        if not cls._requires(
            definition,
            ContextRequirement.PRODUCTS,
        ):
            return []

        products = (
            Product.objects.filter(
                business=business,
                status__in=[
                    Product.Status.DRAFT,
                    Product.Status.ACTIVE,
                ],
            )
            .prefetch_related("images")
            .order_by("-updated_at")
        )

        return [
            {
                "id": product.id,
                "name": product.name,
                "slug": product.slug,
                "category": product.category,
                "sku": product.sku,
                "price": (
                    str(product.price)
                    if product.price is not None
                    else None
                ),
                "currency": product.currency,
                "stock": product.stock,
                "brand": product.brand,
                "material": product.material,
                "size": product.size,
                "color": product.color,
                "condition": product.condition,
                "short_description": product.short_description,
                "description": product.description,
                "seo_title": product.seo_title,
                "seo_description": product.seo_description,
                "selling_points": product.selling_points,
                "keywords": product.keywords,
                "visual_attributes": product.visual_attributes,
                "uncertain_attributes": product.uncertain_attributes,
                "ai_confidence": (
                    float(product.ai_confidence)
                    if product.ai_confidence is not None
                    else None
                ),
                "status": product.status,
                "images": [
                    {
                        "url": (
                            image.image.url
                            if image.image
                            else None
                        ),
                        "alt_text": image.alt_text,
                        "is_primary": image.is_primary,
                    }
                    for image in product.images.all()
                ],
            }
            for product in products
        ]

    @classmethod
    def _get_commerce_page(
        cls,
        business: Business,
        definition: Any,
    ) -> dict[str, Any] | None:
        if not cls._requires(
            definition,
            ContextRequirement.COMMERCE_PAGE,
        ):
            return None

        page = CommercePage.objects.filter(
            business=business
        ).first()

        return cls._serialize_optional(page)

    @staticmethod
    def _serialize_business(
        business: Business,
    ) -> dict[str, Any]:
        return {
            "id": business.id,
            "name": business.name,
            "description": business.description,
            "industry": business.industry,
            "location": business.location,
            "email": business.email,
            "phone": business.phone,
        }

    @staticmethod
    def _serialize_optional(
        instance: Model | None,
    ) -> dict[str, Any] | None:
        if instance is None:
            return None

        excluded = {
            "id",
            "business",
            "created_at",
            "updated_at",
        }

        return {
            field.name: getattr(instance, field.name)
            for field in instance._meta.fields
            if field.name not in excluded
        }