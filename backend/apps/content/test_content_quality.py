from django.test import SimpleTestCase

from apps.content.services.content_quality import (
    assign_slide_media,
    can_publish_native_carousel,
    formats_for_channel,
    merge_slide_captions_into_body,
    sanitize_copy,
    strip_swipe_language,
)
from apps.social.models import SocialAccount


class ContentQualityTests(SimpleTestCase):
    def test_strip_swipe_language(self):
        text = strip_swipe_language(
            "Swipe through to see why this bag works. Order now."
        )
        self.assertNotIn("Swipe", text)
        self.assertIn("Order now.", text)

    def test_sanitize_blocks_swipe_unless_allowed(self):
        caption, cta = sanitize_copy(
            "Swipe to explore the look.",
            "Swipe up for the link.",
            allow_swipe=False,
        )
        self.assertNotIn("Swipe", caption)
        self.assertNotIn("Swipe", cta)
        caption2, _ = sanitize_copy(
            "Swipe through the carousel.",
            "",
            allow_swipe=True,
        )
        self.assertIn("Swipe", caption2)

    def test_assign_slide_media_round_robin(self):
        slides = assign_slide_media(
            [{"caption": "A"}, {"caption": "B"}, {"caption": "C"}],
            ["https://x/1.jpg", "https://x/2.jpg"],
        )
        self.assertEqual(slides[0]["media_url"], "https://x/1.jpg")
        self.assertEqual(slides[1]["media_url"], "https://x/2.jpg")
        self.assertEqual(slides[2]["media_url"], "https://x/1.jpg")

    def test_native_carousel_needs_two_images(self):
        self.assertFalse(can_publish_native_carousel(["https://x/1.jpg"]))
        self.assertTrue(
            can_publish_native_carousel(["https://x/1.jpg", "https://x/2.jpg"])
        )

    def test_merge_slides_not_numbered(self):
        body = merge_slide_captions_into_body(
            "Hello",
            [{"caption": "One"}, {"caption": "Two"}],
        )
        self.assertIn("Hello", body)
        self.assertIn("One", body)
        self.assertNotIn("1. One", body)

    def test_formats_primary_prefers_carousel_when_images(self):
        account = SocialAccount(platform=SocialAccount.Platform.INSTAGRAM)
        self.assertEqual(
            formats_for_channel(account, image_count_n=3, primary_only=True),
            [("instagram", "carousel")],
        )
        self.assertEqual(
            formats_for_channel(account, image_count_n=1, primary_only=True),
            [("instagram", "post")],
        )
        self.assertEqual(
            formats_for_channel(account, image_count_n=0, organic=True),
            [("instagram", "post")],
        )
