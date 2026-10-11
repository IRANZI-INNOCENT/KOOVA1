from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.businesses.models import Business

User = get_user_model()


class BusinessProfileWebsiteScanTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email="scan-owner@example.com",
            password="StrongPassword123!",
            first_name="Scan",
            last_name="Owner",
        )
        self.business = Business.objects.create(
            owner=self.owner,
            name="Unimart",
            description="We sell home furniture in Nairobi.",
            industry="Retail",
            location="Nairobi",
        )
        self.client.force_authenticate(user=self.owner)

    def test_missing_website_is_rejected(self):
        response = self.client.post(
            f"/api/business-brain/{self.business.id}/profile/scan-website/",
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("apps.business_brain.views.scan_website_for_profile")
    def test_owner_can_scan_website(self, scan_website):
        scan_website.return_value = {
            "website": "https://unimart.example",
            "summary": "Kova scanned the site.",
            "suggestions": {
                "mission": "Furnish Nairobi homes.",
                "value_proposition": "",
                "target_market": "",
                "business_model": "Retail",
                "business_stage": "Growing",
                "website": "https://unimart.example",
            },
            "sources": [{"title": "Unimart", "url": "https://unimart.example", "snippet": ""}],
        }
        response = self.client.post(
            f"/api/business-brain/{self.business.id}/profile/scan-website/",
            {"website": "https://unimart.example"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["suggestions"]["business_model"], "Retail")
        scan_website.assert_called_once()
