"""
Commerce-specific Business Brain context.

Snap-to-Sell should not analyze a product in isolation.

It needs to understand the business, its customers and its brand
before generating product intelligence.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from django.apps import apps
from django.db import models as django_models

from apps.commerce.models import CommercePage, Product


class CommerceBusinessContextService:
    """
    Build the Business Brain context required by Commerce AI.
    """

    BRAIN_MODELS = {
        "profile": "BusinessProfile",
        "audience": "BusinessAudience",
        "brand": "BusinessBrand",
    }

    @classmethod
    def build(cls, business):
        """
        Build a structured context for Commerce intelligence.

        Missing Business Brain records are created automatically so
        Snap-to-Sell remains usable even for older businesses created
        before provisioning was introduced.
        """

        context = {
            "business": cls.serialize_instance(
                business,
            ),
            "profile": {},
            "audience": {},
            "brand": {},
            "goals": [],
            "policies": [],
            "commerce_page": {},
            "existing_products": [],
        }

        for key, model_name in cls.BRAIN_MODELS.items():
            model = apps.get_model(
                "business_brain",
                model_name,
            )

            instance, _ = model.objects.get_or_create(
                business=business,
            )

            context[key] = cls.serialize_instance(
                instance,
            )

        commerce_page, _ = CommercePage.objects.get_or_create(
            business=business,
            defaults={
                "title": business.name,
                "description": business.description,
                "email": business.email,
                "phone": business.phone,
                "location": business.location,
            },
        )

        context["commerce_page"] = cls.serialize_instance(
            commerce_page,
        )

        context["existing_products"] = [
            {
                "name": product.name,
                "category": product.category,
                "price": (
                    str(product.price)
                    if product.price is not None
                    else None
                ),
                "currency": product.currency,
                "description": product.description,
            }
            for product in Product.objects.filter(
                business=business,
            )[:20]
        ]

        return context

    @staticmethod
    def serialize_instance(instance):
        """
        Convert a Django model into safe primitive context.

        Relationships are intentionally excluded. Business Brain
        context should contain facts, not Django model objects.
        """

        if instance is None:
            return {}

        result = {}

        for field in instance._meta.concrete_fields:
            if isinstance(field, django_models.ForeignKey):
                value = getattr(
                    instance,
                    field.attname,
                )
            else:
                value = getattr(
                    instance,
                    field.name,
                )

            if isinstance(value, Decimal):
                value = str(value)

            elif isinstance(
                value,
                (datetime, date),
            ):
                value = value.isoformat()

            elif hasattr(value, "pk"):
                value = value.pk

            result[field.name] = value

        return result