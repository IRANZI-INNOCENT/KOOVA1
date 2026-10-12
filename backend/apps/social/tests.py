"""
Tests for the social foundation.

These tests verify:
- SocialAccount CRUD and connection status
- SocialPost publishing lifecycle
- SocialAction audit log
- Social overview aggregation
- Meta OAuth callback (mocked)
- Account disconnect
- Account verify (mocked)
"""

from datetime import timedelta
from unittest.mock import patch, MagicMock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.businesses.models import Business
from apps.content.models import Content

from .adapters.base import TokenExchange
from .models import SocialAccount, SocialAction, SocialPost


User = get_user_model()


class SocialAccountModelTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="social-test@example.com",
            password="StrongPassword123!",
            first_name="Social",
            last_name="Tester",
        )
        self.business = Business.objects.create(
            owner=self.owner,
            name="Social Shop",
            description="Testing social accounts.",
        )

    def test_create_facebook_page_account(self):
        account = SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id="123456",
            account_name="Social Shop Page",
            access_token="fake-token",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        self.assertTrue(account.is_healthy)
        self.assertEqual(str(account), "Facebook Page — Social Shop Page")

    def test_create_instagram_account(self):
        account = SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.INSTAGRAM,
            platform_account_id="789012",
            account_name="socialshop",
            account_username="socialshop",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        self.assertTrue(account.is_healthy)

    def test_expired_account_is_not_healthy(self):
        account = SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id="111222",
            connection_status=SocialAccount.ConnectionStatus.EXPIRED,
        )
        self.assertFalse(account.is_healthy)

    def test_unique_together_prevents_duplicates(self):
        SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id="same-id",
        )
        with self.assertRaises(Exception):
            SocialAccount.objects.create(
                business=self.business,
                platform=SocialAccount.Platform.FACEBOOK_PAGE,
                platform_account_id="same-id",
            )


class SocialPostModelTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="post-test@example.com",
            password="StrongPassword123!",
        )
        self.business = Business.objects.create(
            owner=self.owner,
            name="Post Shop",
        )
        self.account = SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id="page-1",
            account_name="Post Shop",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        self.content = Content.objects.create(
            business=self.business,
            platform="facebook",
            content_type="post",
            caption="Hello world!",
        )

    def test_social_post_lifecycle(self):
        post = SocialPost.objects.create(
            content=self.content,
            social_account=self.account,
            publishing_status=SocialPost.PublishingStatus.PENDING,
        )
        self.assertIsNotNone(post.idempotency_key)
        self.assertIsNone(post.published_at)

        post.publishing_status = SocialPost.PublishingStatus.PUBLISHED
        post.published_at = timezone.now()
        post.external_post_id = "fb_12345"
        post.save()
        post.refresh_from_db()
        self.assertEqual(post.external_post_id, "fb_12345")

    def test_idempotency_key_is_unique(self):
        import uuid

        key = uuid.uuid4()
        SocialPost.objects.create(
            content=self.content,
            social_account=self.account,
            idempotency_key=key,
        )
        with self.assertRaises(Exception):
            SocialPost.objects.create(
                content=self.content,
                social_account=self.account,
                idempotency_key=key,
            )


class SocialActionModelTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="action-test@example.com",
            password="StrongPassword123!",
        )
        self.business = Business.objects.create(
            owner=self.owner,
            name="Action Shop",
        )

    def test_create_action_log(self):
        action = SocialAction.objects.create(
            business=self.business,
            action_type=SocialAction.ActionType.PUBLISH,
            action_status=SocialAction.ActionStatus.COMPLETED,
            intent="Publish a post to Facebook.",
            result="Post published as fb_12345.",
            requires_approval=False,
        )
        self.assertIn("Publish", str(action))
        self.assertIn("Completed", str(action))


class SocialAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email="api-social@example.com",
            password="StrongPassword123!",
            first_name="API",
            last_name="Social",
        )
        self.business = Business.objects.create(
            owner=self.owner,
            name="API Shop",
            description="Testing social API.",
        )
        self.client.force_authenticate(user=self.owner)

    def test_list_accounts_empty(self):
        resp = self.client.get(f"/api/social/{self.business.id}/accounts/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data, [])

    def test_list_accounts_with_data(self):
        SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id="pg-1",
            account_name="My Page",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        resp = self.client.get(f"/api/social/{self.business.id}/accounts/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["account_name"], "My Page")
        self.assertTrue(resp.data[0]["is_healthy"])

    def test_disconnect_account(self):
        account = SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id="pg-2",
            account_name="Disconnect Me",
            access_token="tok",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        resp = self.client.delete(
            f"/api/social/{self.business.id}/accounts/{account.id}/",
        )
        self.assertEqual(resp.status_code, 200)
        account.refresh_from_db()
        self.assertEqual(account.connection_status, "revoked")
        self.assertEqual(account.access_token, "")

    def test_overview_returns_health(self):
        SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id="pg-3",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        Content.objects.create(
            business=self.business,
            platform="facebook",
            content_type="post",
            caption="Draft post",
            status=Content.Status.DRAFT,
        )
        Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="Published post",
            status=Content.Status.PUBLISHED,
        )
        resp = self.client.get(f"/api/social/{self.business.id}/overview/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["channels"]["connected"], 1)
        self.assertEqual(resp.data["channels"]["total"], 1)
        self.assertEqual(resp.data["content"]["drafts"], 1)
        self.assertEqual(resp.data["content"]["published"], 1)

    def test_facebook_return_opens_channels(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(
            "/api/social/meta/callback/",
            {"code": "returned-code", "state": str(self.business.id)},
        )
        self.assertEqual(response.status_code, 302)
        location = response["Location"]
        self.assertIn("http://localhost:3000/workspace/social/channels", location)
        self.assertIn("meta_code=returned-code", location)
        self.assertIn(f"meta_state={self.business.id}", location)

    def test_unauthenticated_is_denied(self):
        self.client.force_authenticate(user=None)
        resp = self.client.get(f"/api/social/{self.business.id}/accounts/")
        self.assertEqual(resp.status_code, 401)

    @patch("apps.social.services.connection.MetaAdapter")
    def test_meta_callback_connects_accounts(self, MockAdapter):
        instance = MockAdapter.return_value
        instance.exchange_code.return_value = TokenExchange(
            access_token="long-lived-tok",
            expires_in=5184000,
            scopes=["pages_show_list", "pages_manage_posts"],
            page_id="pg-meta-1",
            page_name="Test Page",
            page_access_token="page-tok",
            instagram_account_id="ig-meta-1",
            instagram_username="testpage",
        )
        resp = self.client.post(
            f"/api/social/{self.business.id}/meta/callback/",
            {"code": "mock-auth-code", "redirect_uri": "http://localhost/callback"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(len(resp.data["accounts"]), 2)
        self.assertEqual(
            SocialAccount.objects.filter(business=self.business).count(), 2,
        )
        fb = SocialAccount.objects.get(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
        )
        self.assertEqual(fb.account_name, "Test Page")
        self.assertTrue(fb.is_healthy)
        ig = SocialAccount.objects.get(
            business=self.business,
            platform=SocialAccount.Platform.INSTAGRAM,
        )
        self.assertEqual(ig.account_username, "testpage")

    def test_meta_callback_missing_code(self):
        resp = self.client.post(
            f"/api/social/{self.business.id}/meta/callback/",
            {},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    @patch("apps.social.services.connection.MetaAdapter")
    def test_meta_callback_instagram_requires_linked_professional(
        self,
        MockAdapter,
    ):
        instance = MockAdapter.return_value
        instance.exchange_code.return_value = TokenExchange(
            access_token="long-lived-tok",
            expires_in=5184000,
            scopes=["pages_show_list"],
            page_id="pg-meta-1",
            page_name="COVA IA AGENT",
            page_access_token="page-tok",
            instagram_account_id="",
            instagram_username="",
        )
        resp = self.client.post(
            f"/api/social/{self.business.id}/meta/callback/",
            {
                "code": "mock-auth-code",
                "redirect_uri": "http://localhost/callback",
                "platform": "instagram",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(
            resp.data["error_code"],
            "INSTAGRAM_NOT_LINKED_TO_PAGE",
        )
        self.assertEqual(resp.data["page_name"], "COVA IA AGENT")

    def test_instagram_readiness_without_facebook(self):
        resp = self.client.get(
            f"/api/social/{self.business.id}/meta/instagram-readiness/",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.data["facebook_connected"])
        self.assertFalse(resp.data["instagram_linked_to_page"])

    def test_actions_list(self):
        SocialAction.objects.create(
            business=self.business,
            action_type=SocialAction.ActionType.DRAFT,
            action_status=SocialAction.ActionStatus.COMPLETED,
            intent="Draft a post.",
            result="Done.",
            requires_approval=False,
        )
        resp = self.client.get(f"/api/social/{self.business.id}/actions/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)

    @patch("apps.social.adapters.meta.requests.post")
    def test_facebook_publish_uploads_the_product_photo(self, post):
        from django.conf import settings

        from apps.social.adapters.meta import MetaAdapter

        folder = settings.MEDIA_ROOT / "commerce" / "products" / "2026" / "10"
        folder.mkdir(parents=True, exist_ok=True)
        photo = folder / "sofa-publish-test.jpeg"
        photo.write_bytes(b"\xff\xd8\xff\xd9")
        post.return_value.json.return_value = {"id": "photo-1", "post_id": "page_post_1"}
        account = SocialAccount(
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id="page-9",
            access_token="token",
        )
        result = MetaAdapter().publish_post(
            account,
            "The sofa is ready.",
            image_url="/media/commerce/products/2026/10/sofa-publish-test.jpeg",
        )
        self.assertTrue(result.success)
        self.assertEqual(result.external_post_id, "page_post_1")
        self.assertIn("/photos", post.call_args.args[0])
        self.assertIn("source", post.call_args.kwargs["files"])


class FitProfilePictureUrlTests(TestCase):
    def test_long_meta_cdn_url_fits_column(self):
        from apps.social.services.connection import fit_profile_picture_url

        long_url = (
            "https://scontent.example.fbcdn.net/v/t39.30808-1/658157781.jpg?"
            + "a=" + ("x" * 900)
        )
        fitted = fit_profile_picture_url(long_url)
        self.assertLessEqual(len(fitted), 2048)
        self.assertTrue(fitted.startswith("https://"))


class MetaOAuthScopeTests(TestCase):
    def test_instagram_connect_uses_page_scopes_in_login_dialog(self):
        from apps.social.services.capabilities import (
            FACEBOOK_REQUESTED_SCOPES,
            INSTAGRAM_REQUESTED_SCOPES,
            oauth_scopes_for_platform,
        )

        self.assertEqual(oauth_scopes_for_platform("facebook"), FACEBOOK_REQUESTED_SCOPES)
        scopes = oauth_scopes_for_platform("instagram")
        self.assertEqual(scopes, FACEBOOK_REQUESTED_SCOPES)
        self.assertNotIn("instagram_content_publish", scopes)
        self.assertIn("instagram_content_publish", INSTAGRAM_REQUESTED_SCOPES)
