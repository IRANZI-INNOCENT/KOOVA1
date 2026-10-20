from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.businesses.models import Business
from apps.notifications.kinds import EmailKind
from apps.notifications.models import EmailLog, EmailPreference
from apps.notifications.services.events import send_welcome
from apps.notifications.services.notify import notify_user
from apps.notifications.services.render import EmailContent, render_email


User = get_user_model()


class RenderTests(TestCase):
    def test_render_includes_brand_and_cta(self):
        html, text = render_email(
            EmailContent(
                category="alerts",
                title="A post failed",
                subject="Shop: Post failed",
                greeting="Hi Amina,",
                paragraphs=["Publishing failed."],
                cta_label="Open",
                cta_url="https://ai.kcova.com/workspace/social",
                footer_context="Shop",
                prefs_url="https://ai.kcova.com/workspace/settings/email?token=x",
            )
        )
        self.assertIn("KCOVA", html)
        self.assertIn("A post failed", html)
        self.assertIn("Open", html)
        self.assertIn("Manage email preferences", html)
        self.assertIn("A post failed", text)


@override_settings(RESEND_API_KEY="")
class NotifyTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="mail@test.com",
            password="testpass123",
            first_name="Amina",
        )
        self.business = Business.objects.create(owner=self.user, name="Mail Shop")

    def test_welcome_logs_sent_in_dry_run(self):
        with self.captureOnCommitCallbacks(execute=True):
            send_welcome(self.user)
        log = EmailLog.objects.filter(kind=EmailKind.WELCOME).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, EmailLog.Status.SENT)

    def test_preference_skip(self):
        prefs = EmailPreference.objects.create(user=self.user, alerts=False)
        log = notify_user(
            self.user,
            EmailKind.PUBLISH_FAILED,
            business=self.business,
            subject="x",
            title="y",
            paragraphs=["z"],
        )
        self.assertEqual(log.status, EmailLog.Status.SKIPPED)
        self.assertTrue(EmailPreference.objects.filter(pk=prefs.pk).exists())

    def test_password_reset_endpoint(self):
        client = APIClient()
        with patch("apps.notifications.views.send_password_reset") as mocked:
            resp = client.post(
                "/api/notifications/password-reset/",
                {"email": self.user.email},
                format="json",
            )
        self.assertEqual(resp.status_code, 200)
        mocked.assert_called_once()

    def test_preferences_api(self):
        client = APIClient()
        client.force_authenticate(self.user)
        resp = client.get("/api/notifications/preferences/")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["alerts"])
        resp = client.patch(
            "/api/notifications/preferences/",
            {"reports": False},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["reports"])
