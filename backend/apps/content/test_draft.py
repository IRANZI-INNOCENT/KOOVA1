import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.businesses.models import Business
from apps.commerce.models import Product
from apps.content.models import Content, ContentBatch
from apps.social.models import SocialAccount


User = get_user_model()


class FakeWriter:
    """Mock OpenRouter that returns content-type-aware drafts."""

    def __init__(self, timeout=60):
        self.timeout = timeout

    def chat(self, **kwargs):
        messages = kwargs.get("messages", [])
        user_msg = messages[-1]["content"] if messages else ""

        # Campaign draft — multi-format
        if "instagram_post" in user_msg or "facebook_post" in user_msg:
            body = {
                "instagram_post": {
                    "caption": "Your new grey sofa is here. Comfort meets style.",
                    "call_to_action": "Order on WhatsApp.",
                    "hashtags": ["furniture", "nairobi", "sofa", "homedecor"],
                },
                "instagram_carousel": {
                    "caption": "Swipe to see why this sofa is different.",
                    "call_to_action": "DM us to order.",
                    "hashtags": ["furniture", "nairobi", "interiordesign"],
                    "slides": [
                        {"caption": "Meet the grey sofa."},
                        {"caption": "Teal cushions included."},
                        {"caption": "Free delivery in Nairobi."},
                        {"caption": "Order today on WhatsApp."},
                    ],
                },
                "instagram_reel": {
                    "caption": "Hook: This sofa changes everything.\nComfort you feel.\nOrder on WhatsApp.",
                    "call_to_action": "Link in bio.",
                    "hashtags": ["reels", "furniture", "nairobi"],
                },
                "instagram_story": {
                    "caption": "New drop. Grey sofa. Free delivery.",
                    "call_to_action": "Tap to order.",
                    "hashtags": ["sofa", "nairobi"],
                },
                "facebook_post": {
                    "caption": "We just added the grey sofa with teal cushions to our collection. Comfortable, modern, and delivered free in Nairobi.",
                    "call_to_action": "Message us on WhatsApp to order.",
                    "hashtags": ["furniture", "nairobi"],
                },
                "facebook_carousel": {
                    "caption": "Everything you need to know about our new grey sofa.",
                    "call_to_action": "Message us to order.",
                    "hashtags": ["furniture", "nairobifurniture"],
                    "slides": [
                        {"caption": "The grey sofa."},
                        {"caption": "Teal cushion details."},
                        {"caption": "Message us on WhatsApp."},
                    ],
                },
            }
        else:
            # Single draft fallback
            body = {
                "caption": "A grey sofa for the room you actually use.",
                "call_to_action": "Order it on WhatsApp.",
                "hashtags": ["furniture", "nairobi", "homedecor"],
            }

        return {
            "choices": [
                {"message": {"content": json.dumps(body)}}
            ]
        }


class ContentDraftTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email="social-owner@example.com",
            password="StrongPassword123!",
            first_name="Social",
            last_name="Owner",
        )
        self.business = Business.objects.create(
            owner=self.owner,
            name="Unimart",
            description="Home furniture in Nairobi.",
            industry="Retail",
            location="Nairobi",
        )
        self.product = Product.objects.create(
            business=self.business,
            name="Grey sofa",
            price="23000",
            currency="KES",
            color="grey",
            category="Sofas",
            short_description="Modern grey sofa with teal cushions.",
            selling_points=["Comfortable", "Teal cushions", "Free delivery"],
        )
        self.client.force_authenticate(user=self.owner)

    @patch("apps.content.services.draft.OpenRouterService", FakeWriter)
    def test_single_draft_still_works(self):
        response = self.client.post(
            f"/api/content/{self.business.id}/draft/",
            {
                "platform": "instagram",
                "content_type": "post",
                "product_id": self.product.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("sofa", response.data["caption"])

    def test_unknown_platform_is_rejected(self):
        response = self.client.post(
            f"/api/content/{self.business.id}/draft/",
            {"platform": "myspace", "content_type": "post"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_campaign_requires_connected_channels(self):
        response = self.client.post(
            f"/api/content/{self.business.id}/campaign/",
            {"note": "Promote the grey sofa"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Connect", response.data["detail"])

    @patch("apps.content.services.campaign.OpenRouterService", FakeWriter)
    def test_campaign_generates_for_all_channels(self):
        SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id="fb-1",
            account_name="Unimart Page",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.INSTAGRAM,
            platform_account_id="ig-1",
            account_name="unimart",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        response = self.client.post(
            f"/api/content/{self.business.id}/campaign/",
            {"note": "Promote the grey sofa", "product_id": self.product.id},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("batch_id", response.data)
        pieces = response.data["pieces"]
        platforms = {p["platform"] for p in pieces}
        self.assertIn("instagram", platforms)
        self.assertIn("facebook", platforms)
        types = {p["content_type"] for p in pieces}
        self.assertIn("post", types)
        self.assertIn("carousel", types)
        self.assertIn("reel", types)
        self.assertIn("story", types)
        # Verify Content records were created
        self.assertGreaterEqual(Content.objects.filter(business=self.business).count(), 4)
        # Verify batch was created
        self.assertEqual(ContentBatch.objects.filter(business=self.business).count(), 1)

    def test_connected_channels_endpoint(self):
        response = self.client.get(
            f"/api/content/{self.business.id}/channels/",
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["connected"])

        SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.INSTAGRAM,
            platform_account_id="ig-2",
            account_name="unimart",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        response = self.client.get(
            f"/api/content/{self.business.id}/channels/",
        )
        self.assertTrue(response.data["connected"])
        self.assertEqual(len(response.data["accounts"]), 1)

    def test_publish_requires_a_connected_account(self):
        content = Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="Ready to post.",
        )
        response = self.client.post(
            f"/api/content/{self.business.id}/{content.pk}/publish/",
        )
        self.assertEqual(response.status_code, 400)

    @patch("apps.social.services.publish.MetaAdapter.publish_post")
    def test_publish_sends_to_the_connected_account(self, publish_post):
        from apps.social.adapters.base import PublishResult

        publish_post.return_value = PublishResult(success=True, external_post_id="ig-post-1")
        SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.INSTAGRAM,
            platform_account_id="ig-9",
            account_name="unimart",
            access_token="token",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        content = Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="Ready to post.",
            media_urls=["https://example.com/sofa.jpg"],
        )
        response = self.client.post(
            f"/api/content/{self.business.id}/{content.pk}/publish/",
        )
        self.assertEqual(response.status_code, 200)
        content.refresh_from_db()
        self.assertEqual(content.status, "published")
        self.assertIsNotNone(content.published_at)

    def test_save_content_with_product(self):
        response = self.client.post(
            f"/api/content/{self.business.id}/",
            {
                "platform": "instagram",
                "content_type": "post",
                "caption": "Check out this sofa!",
                "product": self.product.id,
                "hashtags": ["sofa", "nairobi"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["product"], self.product.id)
        self.assertEqual(response.data["product_name"], "Grey sofa")

    def test_batches_list(self):
        batch = ContentBatch.objects.create(
            business=self.business,
            product=self.product,
            brief="Promote the sofa.",
        )
        Content.objects.create(
            business=self.business,
            batch=batch,
            platform="instagram",
            content_type="post",
            caption="IG post.",
        )
        Content.objects.create(
            business=self.business,
            batch=batch,
            platform="facebook",
            content_type="post",
            caption="FB post.",
        )
        response = self.client.get(
            f"/api/content/{self.business.id}/batches/",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(len(response.data[0]["contents"]), 2)
        self.assertEqual(response.data[0]["product_name"], "Grey sofa")
