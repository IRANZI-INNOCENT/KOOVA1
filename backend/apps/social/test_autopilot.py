from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.business_brain.models import BusinessBrand, BusinessPolicy, BusinessProfile
from apps.businesses.models import Business
from apps.commerce.models import Product
from apps.kova_ai.context.types import BusinessContext, ContextTask
from apps.kova_ai.decisions.types import Decision, DecisionAction, DecisionStatus
from apps.kova_ai.permissions.engine import PermissionEngine
from apps.kova_ai.permissions.types import PermissionStatus
from apps.kova_ai.services.openrouter import OpenRouterError
from apps.content.models import Content
from apps.social.models import AutopilotEvent, SocialAccount, SocialMessage, SocialPost
from apps.social.services.autopilot import business_picture, run_shift, shift_work


class AutopilotTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="autopilot@test.com",
            password="testpass123",
            first_name="Amina",
            last_name="Otieno",
        )
        self.business = Business.objects.create(
            owner=self.user,
            name="Otieno Sofas",
            description="Sofas made in Nairobi.",
            location="Nairobi",
        )
        self.policy = BusinessPolicy.objects.get(business=self.business)
        self.policy.social_operating_mode = BusinessPolicy.OperatingMode.AUTOPILOT
        self.policy.allow_auto_publish = False
        self.policy.allow_comment_replies = False
        self.policy.save()
        BusinessProfile.objects.filter(business=self.business).update(
            mission="Furnish Nairobi homes.",
        )
        BusinessBrand.objects.filter(business=self.business).update(
            voice="Warm and direct.",
        )
        self.product = Product.objects.create(
            business=self.business,
            name="Grey sectional",
            price=Decimal("12500"),
            currency="KES",
            status=Product.Status.ACTIVE,
            description="",
        )

    def test_autopilot_clears_the_permission_gates(self):
        context = BusinessContext(
            business={"name": "Otieno Sofas"},
            profile=None,
            audience=None,
            brand=None,
            goals=None,
            policy={
                "social_operating_mode": "autopilot",
                "allow_auto_publish": False,
                "allow_comment_replies": False,
            },
            task=ContextTask.GENERAL,
        )
        decision = Decision(
            action=DecisionAction.PUBLISH_CONTENT,
            status=DecisionStatus.READY,
            reason="Publish.",
            requires_approval=True,
        )
        result = PermissionEngine().check(decision=decision, context=context)
        self.assertEqual(result.status, PermissionStatus.ALLOWED)

    @patch("apps.brief.services.reason.generate_brief")
    @patch("apps.social.services.autopilot.schedule_posts")
    @patch("apps.social.services.autopilot.draft_campaign")
    @patch("apps.commerce.services.product_polish.polish_product")
    @patch("apps.social.services.autopilot.OpenRouterService.chat", side_effect=OpenRouterError("offline"))
    @patch("apps.social.services.autopilot.send_reply")
    def test_a_shift_reads_the_company_and_does_the_work(
        self,
        send_reply,
        _chat,
        polish_product,
        draft_campaign,
        schedule_posts,
        generate_brief,
    ):
        SocialMessage.objects.create(
            business=self.business,
            channel=SocialMessage.Channel.FACEBOOK,
            kind=SocialMessage.Kind.COMMENT,
            direction=SocialMessage.Direction.INBOUND,
            body="Is the grey sectional available?",
            draft_reply="Yes. It is KES 12500.",
            delivery_status=SocialMessage.Delivery.RECEIVED,
            reply_target_id="comment-9",
        )
        draft_campaign.return_value = {"pieces": [{"id": 41}]}
        brief = type("Brief", (), {"status": "ready", "greeting": "Good morning.", "error_message": ""})()
        generate_brief.return_value = brief

        shift = run_shift(self.business, force=True)

        self.assertEqual(shift.status, "finished")
        self.assertIn("Otieno Sofas", shift.briefing)
        self.assertIn("Warm and direct", shift.briefing)
        titles = list(shift.events.values_list("title", flat=True))
        self.assertIn("Read the company", titles)
        self.assertIn("Planned the day", titles)
        polish_product.assert_called_once()
        draft_campaign.assert_called_once()
        schedule_posts.assert_called_once()
        send_reply.assert_called_once()
        self.assertTrue(shift.events.filter(status=AutopilotEvent.Status.DONE).exists())

        work = shift_work(self.business, shift)
        packed = str(work)
        self.assertNotIn("Warm and direct", packed)
        self.assertNotIn("Furnish Nairobi", packed)
        self.assertNotIn("Good morning", packed)
        self.assertEqual(work["summary"]["listings"], "1")
        self.assertEqual(work["summary"]["report"], "Filed")
        self.assertEqual(work["posts"][0]["title"], "Grey sectional")
        self.assertEqual(work["posts"][0]["state"], "scheduled")
        self.assertEqual(work["replies"][0]["state"], "sent")

    def test_picture_highlights_the_product_people_are_seeing(self):
        account = SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id="page-picture",
            account_name="Otieno Page",
            access_token="token",
        )
        quiet = Product.objects.create(
            business=self.business,
            name="Oak stool",
            price=Decimal("4000"),
            currency="KES",
            status=Product.Status.ACTIVE,
        )
        self._publish(account, self.product, likes=4, impressions=20)
        self._publish(account, quiet, likes=40, impressions=900)

        picture = business_picture(self.business)

        self.assertEqual(picture["likes"], 44)
        self.assertEqual(picture["impressions"], 920)
        self.assertEqual(picture["products"][0]["name"], "Oak stool")
        self.assertTrue(picture["products"][0]["highlight"])
        self.assertFalse(picture["products"][1]["highlight"])
        self.assertEqual(picture["posts"][0]["impressions"] + picture["posts"][1]["impressions"], 920)
        names = [item["name"] for item in picture["products"]]
        self.assertEqual(names, ["Oak stool", "Grey sectional"])

    def test_picture_skips_the_middle(self):
        account = SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.INSTAGRAM,
            platform_account_id="ig-picture",
            account_name="Otieno IG",
            access_token="token",
        )
        made = []
        for index, impressions in enumerate((1000, 800, 600, 400, 300, 200, 20, 10, 5, 0)):
            product = Product.objects.create(
                business=self.business,
                name=f"Item {index}",
                price=Decimal("1000"),
                currency="KES",
                status=Product.Status.ACTIVE,
            )
            made.append(self._publish(account, product, likes=impressions // 10, impressions=impressions))

        picture = business_picture(self.business)
        names = [item["name"] for item in picture["products"]]

        self.assertEqual(len(names), 8)
        self.assertEqual(names[:4], ["Item 0", "Item 1", "Item 2", "Item 3"])
        self.assertEqual(names[4:], ["Item 6", "Item 7", "Item 8", "Item 9"])
        self.assertNotIn("Item 4", names)
        self.assertNotIn("Item 5", names)
        self.assertEqual(len(picture["posts"]), 8)

    def _publish(self, account, product, *, likes, impressions):
        content = Content.objects.create(
            business=self.business,
            product=product,
            platform=Content.Platform.FACEBOOK,
            content_type=Content.ContentType.POST,
            caption=product.name,
            status=Content.Status.PUBLISHED,
        )
        return SocialPost.objects.create(
            content=content,
            social_account=account,
            publishing_status=SocialPost.PublishingStatus.PUBLISHED,
            external_post_id=f"post-{product.id}",
            likes=likes,
            impressions=impressions,
            reach=impressions // 2,
        )
