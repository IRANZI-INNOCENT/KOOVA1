"""
Business provisioning.

A Business is the root entity of Kova.

When a business is created, its supporting intelligence and commerce
objects are provisioned so that the rest of Kova can immediately work
with a complete business context.
"""

from __future__ import annotations

from django.apps import apps


class BusinessProvisioningService:
    """
    Create the supporting records required by a new Business.

    This service deliberately uses Django's app registry for Business
    Brain models. That keeps the businesses app from creating hard
    circular imports with Business Brain and Commerce.
    """

    BRAIN_MODELS = (
        "BusinessProfile",
        "BusinessAudience",
        "BusinessBrand",
        "BusinessGoal",
        "BusinessPolicy",
    )

    @classmethod
    def provision(cls, business):
        """
        Provision all first-class business context records.

        Existing records are preserved. This makes the operation safe
        to call more than once.
        """

        cls._provision_business_brain(business)
        cls._provision_commerce(business)

    @classmethod
    def _provision_business_brain(cls, business):
        """Create the core Business Brain records."""

        for model_name in cls.BRAIN_MODELS:
            model = apps.get_model(
                "business_brain",
                model_name,
            )

            model.objects.get_or_create(
                business=business,
            )

    @staticmethod
    def _provision_commerce(business):
        """Create the business Commerce Page."""

        CommercePage = apps.get_model(
            "commerce",
            "CommercePage",
        )

        CommercePage.objects.get_or_create(
            business=business,
            defaults={
                "title": business.name,
                "description": business.description,
                "email": business.email,
                "phone": business.phone,
                "location": business.location,
            },
        )