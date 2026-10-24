from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.professional.models import LinkedInConnection, ProfessionalPost
from apps.professional.services import linkedin as linkedin_service


class Command(BaseCommand):
    help = "Publish due scheduled LinkedIn professional posts."

    def handle(self, *args, **options):
        now = timezone.now()
        due = ProfessionalPost.objects.filter(
            status=ProfessionalPost.Status.SCHEDULED,
            scheduled_at__lte=now,
        ).select_related("profile")[:20]

        count = 0
        for post in due:
            connection = LinkedInConnection.objects.filter(
                profile=post.profile,
                connection_status=LinkedInConnection.Status.CONNECTED,
            ).first()
            if not connection or not linkedin_service.linkedin_configured():
                continue
            try:
                urn = linkedin_service.publish_text_post(connection, post)
                post.linkedin_post_urn = urn
                post.status = ProfessionalPost.Status.PUBLISHED
                post.published_at = now
                post.publish_error = ""
                post.save()
                count += 1
            except linkedin_service.LinkedInError as exc:
                post.publish_error = str(exc)[:500]
                post.save(update_fields=["publish_error", "updated_at"])

        self.stdout.write(f"Published {count} LinkedIn post(s).")
