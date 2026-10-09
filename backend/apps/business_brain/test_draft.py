from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import patch

from apps.businesses.models import Business


User = get_user_model()


class BusinessBrainDraftTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email="draft-owner@example.com",
            password="StrongPassword123!",
            first_name="Draft",
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

    def test_progress_starts_at_profile(self):
        response = self.client.get(
            f"/api/business-brain/{self.business.id}/progress/",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["sections"][0]["complete"])
        self.assertIn("business-profile?setup=1", response.data["next_href"])

    @patch("apps.business_brain.views.draft_section")
    def test_owner_can_request_a_profile_draft(self, draft_section):
        draft_section.return_value = {
            "mission": "Help Nairobi homes furnish a room without a long search.",
        }
        response = self.client.post(
            f"/api/business-brain/{self.business.id}/draft/",
            {"section": "profile"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Nairobi", response.data["mission"])
        draft_section.assert_called_once()

    def test_unknown_section_is_rejected(self):
        response = self.client.post(
            f"/api/business-brain/{self.business.id}/draft/",
            {"section": "billing"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
