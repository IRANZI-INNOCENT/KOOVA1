from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.commerce.models import Product
from apps.content.models import Content
from apps.content.services.product_pipeline import product_has_open_pipeline
from apps.social.models import SocialAccount, SocialPost


class ProductPipelineTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="pipeline@test.com",
            password="test-password",
        )
        self.business = Business.objects.create(name="Test Co", owner=self.user)
        self.product = Product.objects.create(
            business=self.business,
            name="Dress",
            status=Product.Status.ACTIVE,
        )
        self.account = SocialAccount.objects.create(
            business=self.business,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            platform_account_id="page-1",
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        )

    def test_scheduled_post_marks_product_busy(self):
        content = Content.objects.create(
            business=self.business,
            product=self.product,
            platform=Content.Platform.FACEBOOK,
            content_type="post",
            caption="Hello",
            status=Content.Status.APPROVED,
        )
        SocialPost.objects.create(
            content=content,
            social_account=self.account,
            publishing_status=SocialPost.PublishingStatus.SCHEDULED,
            scheduled_at=timezone.now() + timezone.timedelta(days=1),
        )
        self.assertTrue(product_has_open_pipeline(self.business, self.product.id))
