from django.core.management.base import BaseCommand

from apps.social.services.publish import dispatch_due


class Command(BaseCommand):
    help = "Send social posts whose scheduled time has arrived."

    def handle(self, *args, **options):
        attempted = dispatch_due()
        self.stdout.write(f"Attempted {attempted} post(s).")
