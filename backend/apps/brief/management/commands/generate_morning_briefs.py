from django.core.management.base import BaseCommand

from apps.brief.services.reason import generate_brief
from apps.businesses.models import Business


class Command(BaseCommand):
    help = "Generate today's morning brief for every business."

    def handle(self, *args, **options):
        count = 0
        for business in Business.objects.all():
            generate_brief(business)
            count += 1
        self.stdout.write(f"Generated briefs for {count} business(es).")
