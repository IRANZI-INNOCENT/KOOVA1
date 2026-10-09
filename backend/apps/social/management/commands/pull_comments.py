import time

from django.core.management.base import BaseCommand

from apps.businesses.models import Business
from apps.social.services.inbox import pull_recent_comments


class Command(BaseCommand):
    help = "Pull new comments from connected Facebook Pages and Instagram accounts."

    def add_arguments(self, parser):
        parser.add_argument(
            "--watch",
            action="store_true",
            help="Keep checking. Stop with Ctrl+C.",
        )
        parser.add_argument(
            "--every",
            type=int,
            default=120,
            help="Seconds between checks when watching. Default is 120.",
        )

    def handle(self, *args, **options):
        if options["watch"]:
            pause = max(30, options["every"])
            self.stdout.write(f"Watching for comments every {pause} seconds.")
            try:
                while True:
                    self._pull()
                    time.sleep(pause)
            except KeyboardInterrupt:
                self.stdout.write("Stopped watching for comments.")
            return
        self._pull()

    def _pull(self):
        saved = 0
        for business in Business.objects.all().iterator():
            saved += pull_recent_comments(business)
        self.stdout.write(f"Saved {saved} new comment(s).")
