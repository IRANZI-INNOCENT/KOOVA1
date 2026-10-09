from django.utils.text import slugify

from apps.businesses.models import Business

from ..models import CommercePage


def get_or_create_commerce_page(
    business: Business,
) -> CommercePage:
    """
    Return the business storefront.

    A storefront is created lazily the first time the owner opens Commerce.
    """

    page, _ = CommercePage.objects.get_or_create(
        business=business,
        defaults={
            "slug": (
                slugify(business.name)
                or f"business-{business.id}"
            ),
            "title": business.name,
            "description": business.description,
            "email": business.email,
            "phone": business.phone,
            "location": business.location,
        },
    )

    return page