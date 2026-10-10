from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.business_brain.models import BusinessPolicy
from apps.businesses.models import Business
from apps.commerce.models import Product
from apps.content.models import Content
from apps.social.adapters.base import PublishResult
from apps.social.models import SocialAccount, SocialMessage, SocialPost
from apps.social.services.command import build_social_command
from apps.social.services.inbox import record_inbound
from apps.social.services.publish import dispatch_due, dispatch_post, price_conflict


class SocialCommandTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="social-command@test.com",
            password="testpass123",
            first_name="Amina",
            last_name="Otieno",
        )
        self.business = Business.objects.create(owner=self.user, name="Command Shop")
        self.product = Product.objects.create(
            business=self.business,
            name="Grey sectional",
            price=Decimal("12500"),
            currency="KES",
            stock=2,
            status=Product.Status.ACTIVE,
        )
        self.account = SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id="page-command",
            account_name="Command Page",
            access_token="token",
            scopes=["pages_show_list", "pages_manage_posts"],
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )

    def test_the_command_center_uses_real_work(self):
        SocialMessage.objects.create(
            business=self.business,
            social_account=self.account,
            channel=SocialMessage.Channel.FACEBOOK,
            kind=SocialMessage.Kind.COMMENT,
            direction=SocialMessage.Direction.INBOUND,
            body="Is the grey sectional still available?",
            delivery_status=SocialMessage.Delivery.RECEIVED,
            intent=SocialMessage.Intent.QUESTION,
            needs_review=True,
        )
        command = build_social_command(self.business)
        self.assertEqual(command["conversations_to_review"], 1)
        titles = [item["title"] for item in command["recommendations"]]
        self.assertIn("Create a product promotion", titles)
        self.assertIn("A customer needs a response", titles)
        self.assertIn("missing permissions", " ".join(titles).lower() + " reconnect")
        self.assertTrue(any("Grey sectional" in item["detail"] for item in command["recommendations"]))

    @patch("apps.social.services.inbox.understand_customer")
    @patch("apps.social.services.inbox.send_reply")
    def test_a_complaint_waits_for_the_owner(self, send_reply, understand):
        policy = BusinessPolicy.objects.get(business=self.business)
        policy.social_operating_mode = BusinessPolicy.OperatingMode.AUTOPILOT
        policy.allow_comment_replies = True
        policy.save(update_fields=["social_operating_mode", "allow_comment_replies"])
        understand.return_value = {
            "intent": "complaint",
            "draft_reply": "I am sorry. We will look at the order.",
            "create_lead": False,
            "confidence": Decimal("0.92"),
            "needs_review": True,
            "product_name": "",
        }
        message = record_inbound(
            business=self.business,
            body="This sofa arrived damaged.",
            channel="facebook",
            kind=SocialMessage.Kind.COMMENT,
            reply_target_id="comment-1",
            social_account=self.account,
        )
        self.assertTrue(message.needs_review)
        self.assertEqual(message.intent, SocialMessage.Intent.COMPLAINT)
        send_reply.assert_called_once()

    def test_a_different_price_is_not_published(self):
        content = Content.objects.create(
            business=self.business,
            product=self.product,
            platform=Content.Platform.FACEBOOK,
            content_type=Content.ContentType.POST,
            caption="Grey sectional now KES 9,000.",
        )
        self.assertEqual(price_conflict(content, "Grey sectional now KES 12,500."), "")
        blocked = price_conflict(content, content.caption)
        self.assertIn("will not publish a different price", blocked)

    @patch("apps.social.services.publish.MetaAdapter.publish_post")
    def test_repeated_failures_pause_scheduled_sends(self, publish_post):
        publish_post.return_value = PublishResult(success=False, error="Meta refused the post.")
        for index in range(3):
            content = Content.objects.create(
                business=self.business,
                product=self.product,
                platform=Content.Platform.FACEBOOK,
                content_type=Content.ContentType.POST,
                caption=f"Grey sectional number {index}.",
            )
            post = SocialPost.objects.create(
                content=content,
                social_account=self.account,
                publishing_status=SocialPost.PublishingStatus.PENDING,
            )
            with self.assertRaises(Exception):
                dispatch_post(post)
        policy = BusinessPolicy.objects.get(business=self.business)
        self.assertTrue(policy.automation_paused)
        later = Content.objects.create(
            business=self.business,
            product=self.product,
            platform=Content.Platform.FACEBOOK,
            content_type=Content.ContentType.POST,
            caption="This one should wait.",
        )
        held = SocialPost.objects.create(
            content=later,
            social_account=self.account,
            publishing_status=SocialPost.PublishingStatus.SCHEDULED,
            scheduled_at=timezone.now() - timedelta(minutes=5),
        )
        dispatch_due(self.business.id)
        held.refresh_from_db()
        self.assertEqual(held.publishing_status, SocialPost.PublishingStatus.SCHEDULED)
