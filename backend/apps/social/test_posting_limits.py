from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.business_brain.models import BusinessPolicy
from apps.businesses.models import Business
from apps.content.models import Content
from apps.social.models import SocialAccount, SocialPost
from apps.social.services.posting_limits import (
    can_autopilot_publish_more,
    plan_publish_times,
    remaining_slots,
)


User = get_user_model()


class PostingLimitsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="cadence@test.com", password="x")
        self.business = Business.objects.create(owner=self.user, name="Cadence Shop")
        self.fb = SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
            account_name="FB",
            access_token="t",
        )
        policy, _ = BusinessPolicy.objects.get_or_create(business=self.business)
        policy.facebook_max_posts_per_day = 2
        policy.facebook_max_posts_per_week = 10
        policy.instagram_max_posts_per_day = 1
        policy.instagram_max_posts_per_week = 5
        policy.min_hours_between_posts = 4
        policy.save()

    def test_remaining_slots_drop_after_publish(self):
        content = Content.objects.create(
            business=self.business,
            platform="facebook",
            content_type="post",
            caption="A",
        )
        SocialPost.objects.create(
            content=content,
            social_account=self.fb,
            publishing_status=SocialPost.PublishingStatus.PUBLISHED,
            published_at=timezone.now(),
        )
        self.assertEqual(remaining_slots(self.business, "facebook"), 1)

    def test_plan_spaces_same_channel_by_gap(self):
        pieces = [
            Content.objects.create(
                business=self.business,
                platform="facebook",
                content_type="post",
                caption=f"P{i}",
            )
            for i in range(3)
        ]
        planned = plan_publish_times(self.business, pieces)
        self.assertEqual(len(planned), 3)
        t0, t1, t2 = planned[0][1], planned[1][1], planned[2][1]
        self.assertGreaterEqual(t1 - t0, timedelta(hours=4))
        self.assertGreaterEqual(t2 - t1, timedelta(hours=4))

    def test_can_autopilot_false_when_caps_zero(self):
        policy = self.business.policy
        policy.facebook_max_posts_per_day = 0
        policy.instagram_max_posts_per_day = 0
        policy.save()
        self.assertFalse(can_autopilot_publish_more(self.business))
