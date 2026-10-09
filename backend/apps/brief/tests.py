import json
from datetime import date
from unittest.mock import patch

from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.content.models import Content
from apps.leads.models import Lead
from apps.social.models import SocialAccount, SocialAction

from .models import MorningBrief
from .services.gather import gather_evidence


FAKE_BRIEF_JSON = json.dumps({
    "greeting": "Good morning, Test Biz!",
    "pulse": {
        "summary": "Your business had moderate activity yesterday.",
        "metrics": [
            {"label": "Content pieces", "value": 1, "change": "steady"},
            {"label": "Leads", "value": 0, "change": None},
        ],
    },
    "pending": {
        "summary": "One content draft needs your review.",
        "items": [
            {"title": "Review draft post", "description": "A post is ready for approval.", "priority": "medium"}
        ],
    },
    "opportunities": {
        "summary": "No new opportunities detected.",
        "items": [],
    },
    "performance": {
        "summary": "No published content to measure yet.",
        "highlights": [],
    },
    "plan": {
        "summary": "Focus on approving the draft content.",
        "steps": ["Review and approve the draft post.", "Connect a social account."],
    },
    "kova_actions": {
        "completed": [],
        "planned": ["Generate content when channels are connected."],
        "needs_approval": [],
    },
})


class FakeResponse:
    """Mocks OpenRouterService.chat()."""
    def __init__(self, content):
        self._content = content

    def __getitem__(self, key):
        if key == "choices":
            return [{"message": {"content": self._content}}]
        raise KeyError(key)


class BriefModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="brief@test.com", password="testpass123",
        )
        self.business = Business.objects.create(
            owner=self.user, name="Test Biz", industry="Retail", location="Nairobi",
        )

    def test_create_brief(self):
        brief = MorningBrief.objects.create(
            business=self.business,
            date=date.today(),
            status=MorningBrief.Status.READY,
            greeting="Good morning!",
            sections={"pulse": {"summary": "All quiet."}},
        )
        self.assertEqual(brief.status, "ready")
        self.assertEqual(brief.sections["pulse"]["summary"], "All quiet.")

    def test_unique_per_business_per_date(self):
        MorningBrief.objects.create(
            business=self.business, date=date.today(),
        )
        with self.assertRaises(Exception):
            MorningBrief.objects.create(
                business=self.business, date=date.today(),
            )


class GatherTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="gather@test.com", password="testpass123",
        )
        self.business = Business.objects.create(
            owner=self.user, name="Gather Biz", industry="Retail", location="Nairobi",
        )

    def test_gather_returns_all_sections(self):
        evidence = gather_evidence(self.business)
        self.assertIn("business", evidence)
        self.assertIn("social", evidence)
        self.assertIn("content", evidence)
        self.assertIn("leads", evidence)
        self.assertIn("commerce", evidence)
        self.assertIn("actions", evidence)

    def test_gather_counts_content(self):
        Content.objects.create(
            business=self.business, platform="instagram",
            content_type="post", caption="Test", status="draft",
        )
        Content.objects.create(
            business=self.business, platform="facebook",
            content_type="post", caption="Live", status="published",
        )
        evidence = gather_evidence(self.business)
        self.assertEqual(evidence["content"]["drafts"], 1)
        self.assertEqual(evidence["content"]["published"], 1)

    def test_gather_counts_leads(self):
        Lead.objects.create(
            business=self.business, customer_name="Test Lead", status="new",
        )
        evidence = gather_evidence(self.business)
        self.assertEqual(evidence["leads"]["total"], 1)
        self.assertGreaterEqual(evidence["leads"]["new_last_24h"], 1)


class BriefAPITests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="api@test.com", password="testpass123",
        )
        self.business = Business.objects.create(
            owner=self.user, name="API Biz", industry="Retail", location="Nairobi",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_get_latest_empty(self):
        resp = self.client.get(f"/api/brief/{self.business.id}/latest/")
        self.assertEqual(resp.status_code, 404)

    @patch("apps.brief.services.reason.OpenRouterService")
    def test_generate_brief(self, MockService):
        instance = MockService.return_value
        instance.chat.return_value = FakeResponse(FAKE_BRIEF_JSON)

        resp = self.client.post(f"/api/brief/{self.business.id}/latest/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "ready")
        self.assertIn("pulse", data["sections"])
        self.assertIn("plan", data["sections"])
        self.assertEqual(data["greeting"], "Good morning, Test Biz!")

    @patch("apps.brief.services.reason.OpenRouterService")
    def test_get_latest_after_generate(self, MockService):
        instance = MockService.return_value
        instance.chat.return_value = FakeResponse(FAKE_BRIEF_JSON)

        self.client.post(f"/api/brief/{self.business.id}/latest/")
        resp = self.client.get(f"/api/brief/{self.business.id}/latest/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["status"], "ready")

    @patch("apps.brief.services.reason.OpenRouterService")
    def test_history_endpoint(self, MockService):
        instance = MockService.return_value
        instance.chat.return_value = FakeResponse(FAKE_BRIEF_JSON)

        self.client.post(f"/api/brief/{self.business.id}/latest/")
        resp = self.client.get(f"/api/brief/{self.business.id}/history/")
        self.assertEqual(resp.status_code, 200)
        self.assertGreaterEqual(len(resp.json()), 1)

    def test_unauthenticated(self):
        anon = APIClient()
        resp = anon.get(f"/api/brief/{self.business.id}/latest/")
        self.assertEqual(resp.status_code, 401)
