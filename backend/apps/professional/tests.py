from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import ContentPillar, ProfessionalProfile


class ProfessionalProfileTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            email="pro@test.com",
            password="test-pass-123",
            first_name="Pro",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_profile_created_on_get(self):
        response = self.client.get("/api/professional/profile/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            ProfessionalProfile.objects.filter(user=self.user).exists(),
        )

    def test_onboarding_choice(self):
        response = self.client.post(
            "/api/professional/onboarding/choice/",
            {"path": "linkedin"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        profile = ProfessionalProfile.objects.get(user=self.user)
        self.assertEqual(profile.onboarding_path, "linkedin")

    def test_profile_ready_requires_basics_and_pillar(self):
        from .services.profile_readiness import is_profile_ready

        profile, _ = ProfessionalProfile.objects.get_or_create(user=self.user)
        self.assertFalse(is_profile_ready(profile))
        profile.headline = "Builder in AI"
        profile.role_title = "Engineer"
        profile.save()
        self.assertFalse(is_profile_ready(profile))
        ContentPillar.objects.create(profile=profile, name="Agentic AI")
        self.assertTrue(is_profile_ready(profile))

    def test_pillar_limit(self):
        profile, _ = ProfessionalProfile.objects.get_or_create(user=self.user)
        for index in range(5):
            ContentPillar.objects.create(
                profile=profile,
                name=f"Pillar {index}",
            )
        response = self.client.post(
            "/api/professional/pillars/",
            {"name": "Sixth"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
