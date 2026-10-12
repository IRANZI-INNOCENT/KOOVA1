import hashlib
import hmac
import json

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.businesses.models import Business
from apps.social.models import SocialAccount
from apps.social.services.meta_webhook import verify_signature


User = get_user_model()


def _sign(body: bytes, secret: str) -> str:
    digest = hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return f"sha256={digest}"


@override_settings(
    FACEBOOK_APP_SECRET="test-app-secret",
    FACEBOOK_WEBHOOK_VERIFY_TOKEN="test-verify-token",
)
class MetaWebhookSecurityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="webhook@test.com",
            password="testpass123",
        )
        self.business = Business.objects.create(
            owner=self.user,
            name="Webhook Shop",
        )
        SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id="page-1",
            account_name="Page",
            access_token="token",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        self.client = APIClient()

    def test_get_requires_matching_verify_token(self):
        ok = self.client.get(
            "/api/social/meta/webhook/",
            {
                "hub.mode": "subscribe",
                "hub.verify_token": "test-verify-token",
                "hub.challenge": "12345",
            },
        )
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.content.decode(), "12345")

        bad = self.client.get(
            "/api/social/meta/webhook/",
            {
                "hub.verify_token": "wrong",
                "hub.challenge": "12345",
            },
        )
        self.assertEqual(bad.status_code, 403)

    def test_post_rejects_missing_signature(self):
        response = self.client.post(
            "/api/social/meta/webhook/",
            {"entry": []},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_post_accepts_valid_signature(self):
        body = json.dumps({"entry": []}).encode("utf-8")
        response = self.client.post(
            "/api/social/meta/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_HUB_SIGNATURE_256=_sign(body, "test-app-secret"),
        )
        self.assertEqual(response.status_code, 200)

    def test_verify_signature_helper(self):
        body = b'{"ok":true}'
        sig = _sign(body, "secret")
        self.assertTrue(verify_signature(body, sig, "secret"))
        self.assertFalse(verify_signature(body, sig, "other"))
        self.assertFalse(verify_signature(body, "sha256=deadbeef", "secret"))
