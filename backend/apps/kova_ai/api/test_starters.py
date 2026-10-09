from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase

from apps.businesses.models import Business
from apps.commerce.models import Product


User = get_user_model()


class StarterPromptTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="owner@example.com", password="testpass123")
        self.business = Business.objects.create(
            owner=self.user,
            name="Kova Agents",
            description="Sofas in Nairobi",
            location="Nairobi",
        )
        Product.objects.create(
            business=self.business,
            name="Rust Orange Sectional",
            price="17500",
            currency="KES",
            status=Product.Status.ACTIVE,
        )
        self.client.force_authenticate(self.user)

    @patch("apps.kova_ai.services.starters.search_market")
    @patch("apps.kova_ai.services.starters.OpenRouterService")
    def test_prompts_use_the_shop_and_the_market_search(self, service_cls, search_market):
        search_market.return_value = (
            "Shoppers in Nairobi are asking for tufted sectionals.",
            [],
        )
        service_cls.return_value.chat.return_value = {
            "choices": [
                {
                    "message": {
                        "content": (
                            '{"prompts": ['
                            '"Draft a post for the Rust Orange Sectional at KES 17500.",'
                            '"Shoppers are asking for tufted sectionals. Write a Facebook post about that.",'
                            '"Which of my sofas should I feature this week?",'
                            '"What should I reply if someone asks about delivery?"]}'
                        )
                    }
                }
            ]
        }

        response = self.client.get(f"/api/kova/starters/?business_id={self.business.id}")

        self.assertEqual(response.status_code, 200)
        self.assertIn("Rust Orange Sectional", response.data["prompts"][0])
        self.assertIn("tufted sectionals", response.data["prompts"][1])
        search_market.assert_called_once()
