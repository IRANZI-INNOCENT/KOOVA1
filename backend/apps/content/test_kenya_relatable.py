"""Unit tests for optional Kenya relatable content mode."""

from django.test import SimpleTestCase, TestCase

from apps.accounts.models import User
from apps.business_brain.models import BusinessBrand
from apps.businesses.models import Business
from apps.content.services.kenya_relatable import (
    apply_relatable_facts,
    format_skit_into_caption,
    is_kenya_relatable_enabled,
    locale_system_addon,
    organic_themes_for_business,
    skit_beats_as_slides,
)
from apps.content.services.organic import ORGANIC_THEMES


class KenyaRelatableHelpersTests(SimpleTestCase):
    def test_locale_addon_empty_when_off(self):
        self.assertEqual(locale_system_addon({"kenya_relatable_mode": False}), "")
        self.assertEqual(locale_system_addon(None), "")

    def test_locale_addon_when_on(self):
        text = locale_system_addon({"kenya_relatable_mode": True})
        self.assertIn("Kenya relatable mode", text)

    def test_format_skit_into_caption(self):
        out = format_skit_into_caption(
            "Order on WhatsApp today.",
            {
                "scene": "Matatu seat",
                "beats": [
                    {
                        "label": "Setup",
                        "visual": "Crowded matatu",
                        "line": "Traffic again?",
                    },
                    {
                        "label": "Twist",
                        "visual": "Unpack bag",
                        "line": "But look…",
                    },
                    {
                        "label": "Land",
                        "visual": "Product close-up",
                        "line": "Sorted.",
                    },
                ],
                "filming_notes": "Vertical phone",
            },
        )
        self.assertIn("FILM THIS", out)
        self.assertIn("Matatu seat", out)
        self.assertIn("CAPTION TO POST:", out)
        self.assertIn("Order on WhatsApp today.", out)

    def test_skit_beats_as_slides(self):
        slides = skit_beats_as_slides(
            {
                "beats": [
                    {"label": "Setup", "visual": "Door", "line": "Hi"},
                ],
            },
        )
        self.assertEqual(len(slides), 1)
        self.assertEqual(slides[0]["kind"], "skit_beat")
        self.assertIn("Setup", slides[0]["caption"])


class KenyaRelatableBusinessTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="relatable@example.com",
            password="test-pass-123",
            first_name="Relatable",
            last_name="Tester",
        )
        self.business = Business.objects.create(
            owner=self.user,
            name="Test Shop",
            description="A shop",
            industry="Fashion",
            location="Nairobi",
        )

    def test_default_off(self):
        self.assertFalse(is_kenya_relatable_enabled(self.business))
        themes = organic_themes_for_business(self.business)
        self.assertEqual(len(themes), len(ORGANIC_THEMES))
        facts = apply_relatable_facts({}, self.business)
        self.assertFalse(facts["kenya_relatable_mode"])

    def test_enabled_adds_themes(self):
        BusinessBrand.objects.create(
            business=self.business,
            kenya_relatable_mode=True,
        )
        self.assertTrue(is_kenya_relatable_enabled(self.business))
        themes = organic_themes_for_business(self.business)
        keys = {t["key"] for t in themes}
        self.assertIn("relatable_moment", keys)
        self.assertIn("hustle_day", keys)
        facts = apply_relatable_facts({}, self.business)
        self.assertTrue(facts["kenya_relatable_mode"])
        self.assertIn("kenya_relatable_guidance", facts)
