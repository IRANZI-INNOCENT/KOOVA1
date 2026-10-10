from django.apps import AppConfig


class CommerceConfig(AppConfig):
    """
    Application configuration for Kova Commerce.

    Commerce contains the business's products, product media,
    storefront, and other commerce-related business assets.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.commerce"
    verbose_name = "Commerce"