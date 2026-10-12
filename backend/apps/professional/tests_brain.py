from django.contrib.auth import get_user_model
from django.test import TestCase

from .models import ContentPillar, ProfessionalProfile
from .services.professional_brain import (
    gather_brain_snapshot,
    match_topic_to_pillar,
    suggest_autopilot_topic,
)


class ProfessionalBrainTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            email="brain@test.com",
            password="test-pass-123",
            first_name="Brain",
        )
        self.profile = ProfessionalProfile.objects.create(
            user=self.user,
            headline="Building agentic systems",
            role_title="Engineer",
            industry="AI",
            tone_notes="No client names. Practical tone.",
        )
        ContentPillar.objects.create(
            profile=self.profile,
            name="Agentic AI",
            weight=3,
        )
        ContentPillar.objects.create(
            profile=self.profile,
            name="Leadership",
            weight=1,
        )

    def test_match_topic_to_pillar(self):
        matched = match_topic_to_pillar(self.profile, "Trends in Agentic AI")
        self.assertEqual(matched, "Agentic AI")

    def test_snapshot_includes_voice(self):
        snapshot = gather_brain_snapshot(
            self.profile,
            topic="Agentic AI patterns",
        )
        self.assertEqual(snapshot["matched_pillar"], "Agentic AI")
        self.assertIn("Engineer", snapshot["voice"]["summary"])

    def test_autopilot_topic_prefers_standing(self):
        self.profile.topic_autopilot_standing_topic = "My newsletter themes"
        self.profile.save()
        self.assertEqual(
            suggest_autopilot_topic(self.profile),
            "My newsletter themes",
        )
