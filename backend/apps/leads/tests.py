"""
Tests for the Leads app API.
"""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.businesses.models import Business

from .models import Lead


class LeadAPITests(TestCase):
    """Test lead CRUD endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="leads@test.com",
            password="test-password",
            first_name="Lead",
            last_name="Tester",
        )
        self.business = Business.objects.create(
            owner=self.user,
            name="Lead Business",
            description="Testing leads.",
            industry="Retail",
            location="Nairobi",
        )
        self.client.force_authenticate(user=self.user)

    def test_list_leads_empty(self):
        response = self.client.get(f"/api/leads/{self.business.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_create_lead(self):
        response = self.client.post(
            f"/api/leads/{self.business.id}/",
            {
                "source": "instagram",
                "interest": "Interested in leather bags",
                "customer_name": "Jane Doe",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["source"], "instagram")
        self.assertEqual(response.data["status"], "new")
        self.assertFalse(response.data["created_by_ai"])

    def test_list_leads_with_status_filter(self):
        Lead.objects.create(
            business=self.business,
            source="instagram",
            interest="Bags",
            status=Lead.Status.NEW,
        )
        Lead.objects.create(
            business=self.business,
            source="facebook",
            interest="Shoes",
            status=Lead.Status.QUALIFIED,
        )

        response = self.client.get(
            f"/api/leads/{self.business.id}/",
            {"status": "new"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["status"], "new")

    def test_get_lead_detail(self):
        lead = Lead.objects.create(
            business=self.business,
            source="whatsapp",
            interest="Wants pricing",
            customer_name="John",
        )
        response = self.client.get(
            f"/api/leads/{self.business.id}/{lead.pk}/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["customer_name"], "John")

    def test_update_lead_status(self):
        lead = Lead.objects.create(
            business=self.business,
            source="instagram",
            interest="Bags",
            status=Lead.Status.NEW,
        )
        response = self.client.patch(
            f"/api/leads/{self.business.id}/{lead.pk}/",
            {"status": "qualified"},
        )
        self.assertEqual(response.status_code, 200)
        lead.refresh_from_db()
        self.assertEqual(lead.status, "qualified")

    def test_delete_lead(self):
        lead = Lead.objects.create(
            business=self.business,
            source="web",
            interest="General inquiry",
        )
        response = self.client.delete(
            f"/api/leads/{self.business.id}/{lead.pk}/"
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Lead.objects.filter(pk=lead.pk).exists())

    def test_unauthenticated_access_denied(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(f"/api/leads/{self.business.id}/")
        self.assertEqual(response.status_code, 401)
