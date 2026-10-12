import hashlib
import hmac
import json
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.businesses.models import Business
from apps.content.models import Content
from apps.leads.models import Lead
from apps.social.adapters.base import PublishResult
from apps.social.models import SocialAccount, SocialMessage, SocialPost
from apps.social.services.inbox import record_inbound
from apps.social.services.publish import dispatch_due, enqueue, outgoing_text


User = get_user_model()


def _webhook_sign(body: bytes, secret: str) -> str:
    digest = hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()
    return f"sha256={digest}"


@override_settings(
    FACEBOOK_APP_SECRET="loop-webhook-secret",
    FACEBOOK_WEBHOOK_VERIFY_TOKEN="loop-verify",
)
class LoopTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="loop@test.com", password="testpass123")
        self.business = Business.objects.create(owner=self.user, name="Loop Shop")
        self.understand = patch("apps.social.services.inbox.understand_customer")
        self.mock_understand = self.understand.start()
        self.mock_understand.return_value = {
            "intent": "other",
            "draft_reply": "Thanks for writing in.",
            "create_lead": False,
        }
        self.addCleanup(self.understand.stop)
        self.account = SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id="page-1",
            account_name="Loop Page",
            access_token="token",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_buying_message_creates_a_lead(self):
        self.mock_understand.return_value = {
            "intent": "buying",
            "draft_reply": "The sofa is KSh 23,000 and we deliver in Nairobi.",
            "create_lead": True,
        }
        message = record_inbound(
            business=self.business,
            body="How much is the sofa and can you do delivery?",
            channel="instagram",
            customer_name="Asha",
        )
        self.assertEqual(message.intent, SocialMessage.Intent.BUYING)
        self.assertIn("23,000", message.draft_reply)
        self.assertEqual(Lead.objects.filter(business=self.business).count(), 1)

    def test_webhook_stores_a_page_message(self):
        self.mock_understand.return_value = {
            "intent": "buying",
            "draft_reply": "Yes, it is still available.",
            "create_lead": True,
        }
        payload = {
            "entry": [
                {
                    "id": "page-1",
                    "messaging": [
                        {
                            "sender": {"id": "cust-1"},
                            "message": {"mid": "m-1", "text": "Is this still available?"},
                        }
                    ],
                }
            ]
        }
        body = json.dumps(payload).encode("utf-8")
        response = self.client.post(
            "/api/social/meta/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_HUB_SIGNATURE_256=_webhook_sign(
                body,
                "loop-webhook-secret",
            ),
        )
        self.assertEqual(response.status_code, 200)
        stored = SocialMessage.objects.get(external_id="m-1")
        self.assertEqual(stored.kind, SocialMessage.Kind.MESSAGE)
        self.assertEqual(stored.reply_target_id, "cust-1")
        self.assertEqual(stored.draft_reply, "Yes, it is still available.")
        self.assertEqual(Lead.objects.count(), 1)

    def test_webhook_stores_a_comment(self):
        self.mock_understand.return_value = {
            "intent": "question",
            "draft_reply": "Yes, this one is in stock.",
            "create_lead": False,
        }
        payload = {
            "entry": [
                {
                    "id": "page-1",
                    "changes": [
                        {
                            "field": "comments",
                            "value": {
                                "comment_id": "c-9",
                                "text": "Do you still have this sofa?",
                                "from": {"name": "Asha", "id": "cust-9"},
                            },
                        }
                    ],
                }
            ]
        }
        body = json.dumps(payload).encode("utf-8")
        response = self.client.post(
            "/api/social/meta/webhook/",
            data=body,
            content_type="application/json",
            HTTP_X_HUB_SIGNATURE_256=_webhook_sign(
                body,
                "loop-webhook-secret",
            ),
        )
        self.assertEqual(response.status_code, 200)
        stored = SocialMessage.objects.get(external_id="c-9")
        self.assertEqual(stored.kind, SocialMessage.Kind.COMMENT)
        self.assertEqual(stored.reply_target_id, "c-9")
        self.assertEqual(Lead.objects.count(), 0)

    @patch("apps.social.services.inbox.MetaAdapter")
    def test_comment_reply_is_sent(self, adapter):
        adapter.return_value.send_reply.return_value = PublishResult(
            success=True,
            external_post_id="reply-1",
        )
        message = record_inbound(
            business=self.business,
            body="Do you deliver?",
            channel="facebook",
            kind="comment",
            reply_target_id="c-1",
            external_id="c-1",
            social_account=self.account,
        )
        response = self.client.post(
            f"/api/social/{self.business.id}/messages/{message.id}/reply/",
            {"body": "Yes, we deliver in Nairobi."},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["delivery_status"], "sent")
        adapter.return_value.send_reply.assert_called_once()

    @patch("apps.social.services.publish.MetaAdapter.publish_post")
    def test_future_post_waits_until_dispatch(self, publish_post):
        publish_post.return_value = PublishResult(success=True, external_post_id="fb-1")
        content = Content.objects.create(
            business=self.business,
            platform="facebook",
            content_type="post",
            caption="Tomorrow.",
        )
        post = enqueue(content, timezone.now() + timedelta(days=1))
        self.assertEqual(post.publishing_status, SocialPost.PublishingStatus.SCHEDULED)
        publish_post.assert_not_called()
        post.scheduled_at = timezone.now() - timedelta(minutes=1)
        post.save(update_fields=["scheduled_at"])
        dispatch_due(self.business.id)
        post.refresh_from_db()
        self.assertEqual(post.publishing_status, SocialPost.PublishingStatus.PUBLISHED)

    def test_store_order_is_recorded(self):
        from apps.commerce.models import CommercePage, Product

        page = CommercePage.objects.get(business=self.business)
        page.is_published = True
        page.whatsapp = "254700000000"
        page.save()
        Product.objects.create(
            business=self.business,
            name="Sofa",
            slug="sofa",
            status=Product.Status.ACTIVE,
            price="23000",
        )
        response = self.client.post(
            "/api/commerce/public/loop-shop/orders/",
            {"product_slug": "sofa", "customer_name": "Asha"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        listed = self.client.get(f"/api/commerce/{self.business.id}/orders/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(len(listed.data), 1)

    def test_carousel_slides_go_out_as_text(self):
        content = Content.objects.create(
            business=self.business,
            platform="facebook",
            content_type="carousel",
            caption="Meet Kova.",
            call_to_action="Send a message.",
            slides=[{"caption": "First slide"}, {"caption": "Second slide"}],
            hashtags=["Nairobi"],
        )
        text = outgoing_text(content)
        self.assertIn("Meet Kova.", text)
        self.assertIn("1. First slide", text)
        self.assertIn("2. Second slide", text)
        self.assertIn("Send a message.", text)
        self.assertIn("#Nairobi", text)

    def test_published_caption_includes_the_product_page(self):
        from apps.commerce.models import CommercePage, Product

        page = CommercePage.objects.get(business=self.business)
        page.is_published = True
        page.save()
        product = Product.objects.create(
            business=self.business,
            name="Grey Sofa",
            status=Product.Status.ACTIVE,
        )
        content = Content.objects.create(
            business=self.business,
            platform="facebook",
            content_type="post",
            caption="Meet the grey sofa.",
            product=product,
        )
        text = outgoing_text(content)
        self.assertIn("Meet the grey sofa.", text)
        self.assertIn(
            f"http://localhost:3000/store/{page.slug}/{product.slug}",
            text,
        )

    def test_performance_counts_messages(self):
        record_inbound(
            business=self.business,
            body="hello",
            channel="facebook",
        )
        response = self.client.get(f"/api/social/{self.business.id}/performance/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["messages"]["inbound"], 1)
