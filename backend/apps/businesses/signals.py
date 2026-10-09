"""
Business lifecycle signals.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Business
from .services.provisioning import BusinessProvisioningService


@receiver(
    post_save,
    sender=Business,
)
def provision_new_business(
    sender,
    instance,
    created,
    **kwargs,
):
    """
    Provision Business Brain and Commerce after a new Business exists.

    The signal only provisions newly-created businesses. Existing
    records are never overwritten.
    """

    if not created:
        return

    BusinessProvisioningService.provision(
        instance,
    )