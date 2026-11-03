from django.test import SimpleTestCase

from apps.content.services.content_quality import (
    assign_slide_media,
    can_publish_native_carousel,
    ensure_real_destination,
    formats_for_channel,
    merge_slide_captions_into_body,
    place_destination,
    sanitize_copy,
    strip_swipe_language,
)
from apps.social.models import SocialAccount


class ContentQualityTests(SimpleTestCase):
    def test_visit_line_gains_the_real_address(self):
        text = ensure_real_destination(
            "You have the skills.\n\n"
            "Visit our platform to start refining your professional profile today.",
            "https://studiocv.example",
        )
        self.assertIn("Visit our platform", text)
        self.assertIn("https://studiocv.example", text)

    def test_visit_line_without_an_address_is_removed(self):
        text = ensure_real_destination(
            "You have the skills. Let's make sure they are front and center.\n\n"
            "Visit our platform to start refining your professional profile today.",
            "",
        )
        self.assertNotIn("platform", text.lower())
        self.assertIn("front and center", text)

    def test_talking_about_the_platform_is_not_treated_as_a_visit(self):
        original = "Building our platform taught me to keep the brief short."
        self.assertEqual(
            ensure_real_destination(original, "https://skills.example"),
            original,
        )

    def test_a_post_that_does_not_invite_a_visit_stays_as_written(self):
        original = "A generic CV rarely hits the mark. Tailor it to the role."
        self.assertEqual(ensure_real_destination(original, "https://studiocv.example"), original)

    def test_visit_call_to_action_moves_onto_the_caption_with_the_link(self):
        caption, action = place_destination(
            "Your CV is the first handshake.",
            "Visit our website.",
            "https://skills.example",
        )
        self.assertIn("https://skills.example", caption)
        self.assertIn("Visit our website.", caption)
        self.assertEqual(action, "")

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
