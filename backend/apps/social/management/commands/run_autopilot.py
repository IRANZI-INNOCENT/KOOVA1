from django.core.management.base import BaseCommand

from apps.business_brain.models import BusinessPolicy
from apps.social.services.autopilot import run_shift


class Command(BaseCommand):
    help = "Run one Autopilot shift for every business that handed Kova the work."

    def handle(self, *args, **options):
        policies = BusinessPolicy.objects.filter(
            social_operating_mode=BusinessPolicy.OperatingMode.AUTOPILOT,
        ).select_related("business")
        ran = 0
        for policy in policies:
            run_shift(policy.business)
            ran += 1
        self.stdout.write(f"Checked {ran} Autopilot business(es).")
