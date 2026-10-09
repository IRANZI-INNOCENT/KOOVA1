"""
Tests for the Content app API.
"""

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.businesses.models import Business

from .models import Content


class ContentAPITests(TestCase):
    """Test content CRUD endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="content@test.com",
            password="test-password",
            first_name="Content",
            last_name="Tester",
        )
        self.business = Business.objects.create(
            owner=self.user,
            name="Content Business",
            description="Testing content.",
            industry="Retail",
            location="Nairobi",
        )
        self.client.force_authenticate(user=self.user)

    def test_list_content_empty(self):
        response = self.client.get(f"/api/content/{self.business.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 0)

    def test_create_content(self):
        response = self.client.post(
            f"/api/content/{self.business.id}/",
            {
                "platform": "instagram",
                "content_type": "post",
                "caption": "New product drop!",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["platform"], "instagram")
        self.assertEqual(response.data["status"], "draft")
        self.assertFalse(response.data["created_by_ai"])

    def test_list_content_with_filter(self):
        Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="IG post",
        )
        Content.objects.create(
            business=self.business,
            platform="facebook",
            content_type="post",
            caption="FB post",
        )

        response = self.client.get(
            f"/api/content/{self.business.id}/",
            {"platform": "instagram"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["platform"], "instagram")

    def test_get_content_detail(self):
        content = Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="Detail test",
        )
        response = self.client.get(
            f"/api/content/{self.business.id}/{content.pk}/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["caption"], "Detail test")

    def test_update_content(self):
        content = Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="Original caption",
        )
        response = self.client.patch(
            f"/api/content/{self.business.id}/{content.pk}/",
            {"caption": "Updated caption"},
        )
        self.assertEqual(response.status_code, 200)
        content.refresh_from_db()
        self.assertEqual(content.caption, "Updated caption")

    def test_delete_content(self):
        content = Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="To delete",
        )
        response = self.client.delete(
            f"/api/content/{self.business.id}/{content.pk}/"
        )
        self.assertEqual(response.status_code, 204)
        self.assertFalse(Content.objects.filter(pk=content.pk).exists())

    def test_approve_content(self):
        content = Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="To approve",
            status=Content.Status.DRAFT,
        )
        response = self.client.post(
            f"/api/content/{self.business.id}/{content.pk}/approve/"
        )
        self.assertEqual(response.status_code, 200)
        content.refresh_from_db()
        self.assertEqual(content.status, "approved")

    def test_approve_non_draft_fails(self):
        content = Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="Already published",
            status=Content.Status.PUBLISHED,
        )
        response = self.client.post(
            f"/api/content/{self.business.id}/{content.pk}/approve/"
        )
        self.assertEqual(response.status_code, 400)

    def test_reject_content(self):
        content = Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="To reject",
            status=Content.Status.DRAFT,
        )
        response = self.client.post(
            f"/api/content/{self.business.id}/{content.pk}/reject/"
        )
        self.assertEqual(response.status_code, 200)
        content.refresh_from_db()
        self.assertEqual(content.status, "rejected")

    def test_reject_published_fails(self):
        content = Content.objects.create(
            business=self.business,
            platform="instagram",
            content_type="post",
            caption="Published",
            status=Content.Status.PUBLISHED,
        )
        response = self.client.post(
            f"/api/content/{self.business.id}/{content.pk}/reject/"
        )
        self.assertEqual(response.status_code, 400)

    def test_unauthenticated_access_denied(self):
        self.client.force_authenticate(user=None)
        response = self.client.get(f"/api/content/{self.business.id}/")
        self.assertEqual(response.status_code, 401)
