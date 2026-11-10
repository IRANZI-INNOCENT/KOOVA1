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

    def test_create_order_from_lead(self):
        from apps.commerce.models import Order, Product

        product = Product.objects.create(
            business=self.business,
            name="Bag",
            slug="bag",
            price="1500.00",
            status=Product.Status.ACTIVE,
        )
        lead = Lead.objects.create(
            business=self.business,
            product=product,
            source="whatsapp",
            interest="I want the bag",
            customer_name="Amina",
            customer_id="+254712345678",
            status=Lead.Status.NEW,
        )
        response = self.client.post(
            f"/api/leads/{self.business.id}/{lead.pk}/order/",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Order.objects.filter(business=self.business).count(), 1)
        order = Order.objects.get()
        self.assertEqual(order.product_id, product.id)
        self.assertEqual(order.customer_name, "Amina")
        self.assertEqual(order.source, "whatsapp")
        lead.refresh_from_db()
        self.assertEqual(lead.status, Lead.Status.QUALIFIED)

    def test_lead_marked_converted_when_order_delivered(self):
        from apps.commerce.models import Order, Product
        from apps.commerce.services.orders import apply_order_update

        product = Product.objects.create(
            business=self.business,
            name="Shoes",
            slug="shoes",
            price="2000.00",
            stock=10,
            status=Product.Status.ACTIVE,
        )
        lead = Lead.objects.create(
            business=self.business,
            product=product,
            source="whatsapp",
            interest="Size 42",
            customer_name="Tom",
            status=Lead.Status.QUALIFIED,
        )
        order = Order.objects.create(
            business=self.business,
            product=product,
            lead=lead,
            status=Order.Status.NEW,
        )
        apply_order_update(order, data={"status": Order.Status.CONFIRMED})
        apply_order_update(order, data={"status": Order.Status.DELIVERED})
        lead.refresh_from_db()
        self.assertEqual(lead.status, Lead.Status.CONVERTED)

    def test_create_order_from_lost_lead_fails(self):
        lead = Lead.objects.create(
            business=self.business,
            source="instagram",
            interest="No longer interested",
            status=Lead.Status.LOST,
        )
        response = self.client.post(
            f"/api/leads/{self.business.id}/{lead.pk}/order/",
        )
        self.assertEqual(response.status_code, 400)
