"""Unit tests for storefront branding helpers (no DB)."""

from django.test import SimpleTestCase

from apps.commerce.services.store_theme import (
    normalize_hex_color,
    normalize_store_slug,
)


class StoreThemeHelpersTests(SimpleTestCase):
    def test_normalize_hex_color(self):
        self.assertEqual(
            normalize_hex_color("#176b4d", default="#000000"),
            "#176B4D",
        )
        self.assertEqual(
            normalize_hex_color("F4B183", default="#000000"),
            "#F4B183",
        )
        self.assertEqual(
            normalize_hex_color("", default="#176B4D"),
            "#176B4D",
        )
        with self.assertRaises(ValueError):
            normalize_hex_color("not-a-color", default="#176B4D")

    def test_normalize_store_slug(self):
        self.assertEqual(normalize_store_slug("My Cool Shop!"), "my-cool-shop")
        with self.assertRaises(ValueError):
            normalize_store_slug("a")
        with self.assertRaises(ValueError):
            normalize_store_slug("admin")
