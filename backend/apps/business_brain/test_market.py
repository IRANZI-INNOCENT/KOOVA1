import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.business_brain.models import BusinessMarketBrief
from apps.businesses.models import Business
from apps.kova_ai.context.engine import ContextEngine


User = get_user_model()

SOURCE = "https://example.com/sofas"


class FakeSearch:
    def __init__(self, timeout=120):
        self.timeout = timeout

    def chat(self, **kwargs):
        if kwargs.get("plugins"):
            return {
                "choices": [
                    {
                        "message": {
                            "content": "Example Furn lists sofas in Nairobi.",
                            "annotations": [
                                {
                                    "type": "url_citation",
                                    "url_citation": {
                                        "url": SOURCE,
                                        "title": "Example Furn",
                                        "content": "Sofas in Nairobi from KSh 20,000.",
                                    },
                                }
                            ],
                        }
                    }
                ]
            }
        return {
            "choices": [
                {
                    "message": {
                        "content": json.dumps(
                            {
                                "summary": "Example Furn sells sofas in Nairobi.",
                                "competitors": [
                                    {
                                        "name": "Example Furn",
                                        "note": "Lists sofas from KSh 20,000.",
                                        "source_url": SOURCE,
                                    },
                                    {
                                        "name": "Invented Shop",
                                        "note": "No page says this.",
                                        "source_url": "https://invented.example/nope",
                                    },
                                ],
                                "gap": "A clearer room-by-room offer.",
                                "positioning": "Furnish one room without a long search.",
                                "sources": [
                                    {"title": "Example Furn", "url": SOURCE},
                                ],
                            }
                        )
                    }
                }
            ]
        }


class BrokenBriefSearch(FakeSearch):
    def chat(self, **kwargs):
        if kwargs.get("plugins"):
            return super().chat(**kwargs)
        return {
            "choices": [
                {
                    "message": {
                        "content": '{\n  "summary": "Example Furn sells sofas',
                    }
                }
            ]
        }


class ThinSearch(FakeSearch):
    def chat(self, **kwargs):
        return {
            "choices": [
                {
                    "message": {
                        "content": "Many shops might exist.",
                        "annotations": [],
                    }
                }
            ]
        }


class BusinessMarketTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email="market-owner@example.com",
            password="StrongPassword123!",
            first_name="Market",
            last_name="Owner",
        )
        self.other = User.objects.create_user(
            email="market-other@example.com",
            password="StrongPassword123!",
            first_name="Other",
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

    @patch(
        "apps.business_brain.services.research.OpenRouterService",
        FakeSearch,
    )
    def test_research_keeps_only_cited_competitors(self):
        response = self.client.post(
            f"/api/business-brain/{self.business.id}/market/research/",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ready")
        self.assertFalse(response.data["kept"])
        self.assertEqual(len(response.data["competitors"]), 1)
        self.assertEqual(response.data["competitors"][0]["name"], "Example Furn")
        self.assertEqual(response.data["sources"][0]["url"], SOURCE)

    @patch(
        "apps.business_brain.services.research.OpenRouterService",
        BrokenBriefSearch,
    )
    def test_broken_brief_still_returns_sources(self):
        response = self.client.post(
            f"/api/business-brain/{self.business.id}/market/research/",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["competitors"], [])
        self.assertEqual(response.data["sources"][0]["url"], SOURCE)
        self.assertIn("Example Furn", response.data["summary"])

    @patch(
        "apps.business_brain.services.research.OpenRouterService",
        ThinSearch,
    )
    def test_thin_search_does_not_invent_competitors(self):
        response = self.client.post(
            f"/api/business-brain/{self.business.id}/market/research/",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["competitors"], [])
        self.assertIn("did not invent", response.data["summary"])

    def test_keep_feeds_context_and_leave_does_not(self):
        BusinessMarketBrief.objects.create(
            business=self.business,
            status=BusinessMarketBrief.Status.READY,
            summary="A sourced brief.",
            positioning="Furnish one room.",
            researched_at=self.business.created_at,
        )
        kept = self.client.post(
            f"/api/business-brain/{self.business.id}/market/decision/",
            {"kept": True},
            format="json",
        )
        self.assertEqual(kept.status_code, status.HTTP_200_OK)
        context = ContextEngine().build(business_id=self.business.id)
        self.assertEqual(context.market["positioning"], "Furnish one room.")

        left = self.client.post(
            f"/api/business-brain/{self.business.id}/market/decision/",
            {"kept": False},
            format="json",
        )
        self.assertEqual(left.status_code, status.HTTP_200_OK)
        self.assertEqual(left.data["status"], "skipped")
        context = ContextEngine().build(business_id=self.business.id)
        self.assertIsNone(context.market)

    def test_keep_before_research_is_rejected(self):
        response = self.client.post(
            f"/api/business-brain/{self.business.id}/market/decision/",
            {"kept": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_another_owner_cannot_research(self):
        self.client.force_authenticate(user=self.other)
        response = self.client.post(
            f"/api/business-brain/{self.business.id}/market/research/",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_progress_includes_market_last(self):
        response = self.client.get(
            f"/api/business-brain/{self.business.id}/progress/",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sections"][-1]["key"], "market")
        self.assertFalse(response.data["sections"][-1]["complete"])
