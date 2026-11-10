from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.businesses.models import Business
from apps.commerce.models import Order
from apps.content.models import Content
from apps.social.models import SocialMessage
from apps.social.services.workspace_queue import build_workspace_queue


class WorkspaceQueueTests(TestCase):
    def setUp(self):
        user = get_user_model().objects.create_user(
            email="queue@test.com",
            password="pass12345",
        )
        self.business = Business.objects.create(owner=user, name="Queue Shop")

    def test_counts_open_work(self):
        Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="Draft post",
            status=Content.Status.DRAFT,
        )
        SocialMessage.objects.create(
            business=self.business,
            channel="facebook",
            body="Price?",
            needs_review=True,
            draft_reply="It is KES 1000.",
        )
        Order.objects.create(business=self.business, status=Order.Status.NEW)

        payload = build_workspace_queue(self.business)
        self.assertEqual(payload["counts"]["total"], 3)
        self.assertEqual(payload["counts"]["draft_posts"], 1)
        self.assertEqual(payload["counts"]["messages_review"], 1)
        self.assertEqual(payload["counts"]["open_orders"], 1)
