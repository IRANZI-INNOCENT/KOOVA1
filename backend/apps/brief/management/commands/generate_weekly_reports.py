from django.core.management.base import BaseCommand

from apps.brief.services.weekly import generate_weekly_report
from apps.businesses.models import Business


class Command(BaseCommand):
    help = "Generate this week's performance report for every business."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Regenerate even if a ready report already exists.",
        )

    def handle(self, *args, **options):
        force = bool(options.get("force"))
        count = 0
        for business in Business.objects.all():
            generate_weekly_report(business, force=force)
            count += 1
        self.stdout.write(f"Generated weekly reports for {count} business(es).")
