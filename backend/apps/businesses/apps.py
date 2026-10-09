from django.apps import AppConfig


class BusinessesConfig(AppConfig):
    """
    Configuration for the Kova Businesses application.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.businesses"

    def ready(self):
        """
        Register business lifecycle signals.
        """

        from . import signals  # noqa: F401