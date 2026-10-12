from django.core.management.base import BaseCommand

from apps.professional.services.topic_autopilot import run_all_topic_autopilots


class Command(BaseCommand):
    help = "Plan and schedule topic weeks for LinkedIn autopilot profiles."

    def handle(self, *args, **options):
        count = run_all_topic_autopilots()
        self.stdout.write(f"Ran topic autopilot for {count} profile(s).")
