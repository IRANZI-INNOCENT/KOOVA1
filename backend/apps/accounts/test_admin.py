from django.contrib.auth import get_user_model
from django.test import TestCase


class KovaAdminTests(TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_superuser(
            email="admin@kova.test",
            password="StrongPassword123!",
            first_name="Kova",
            last_name="Admin",
        )
        self.client.force_login(self.admin)

    def test_home_shows_operations(self):
        response = self.client.get("/admin/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "New orders")
        self.assertContains(response, "Failed posts")
        self.assertContains(response, "Waiting replies")

    def test_every_section_opens(self):
        paths = [
            "/admin/accounts/user/",
            "/admin/accounts/user/add/",
            "/admin/businesses/business/",
            "/admin/businesses/business/add/",
            "/admin/commerce/product/",
            "/admin/commerce/order/",
            "/admin/commerce/commercepage/",
            "/admin/content/content/",
            "/admin/content/contentbatch/",
            "/admin/leads/lead/",
            "/admin/social/socialaccount/",
            "/admin/social/socialpost/",
            "/admin/social/socialmessage/",
            "/admin/social/socialaction/",
            "/admin/brief/morningbrief/",
            "/admin/business_brain/businesspolicy/",
        ]
        for path in paths:
            response = self.client.get(path)
            self.assertEqual(response.status_code, 200, path)
