from django.core.management.base import BaseCommand

from apps.leads.services.followups import bump_stale_follow_ups


class Command(BaseCommand):
    help = "Refresh overdue open-lead follow-up drafts for the workspace queue."

    def handle(self, *args, **options):
        updated = bump_stale_follow_ups()
        self.stdout.write(self.style.SUCCESS(f"Refreshed {updated} lead follow-ups."))
