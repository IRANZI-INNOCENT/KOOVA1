from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from apps.commerce.services.product_vision import ProductVisionService


class ProductVisionTests(SimpleTestCase):
    """Test the AI provider boundary without making network calls."""

    @patch(
        "apps.commerce.services.product_vision.OpenRouterService"
    )
    def test_multimodal_request_is_structured_and_normalized(
        self, MockOpenRouterService,
    ):
        mock_provider = MockOpenRouterService.return_value
        mock_provider.chat.return_value = {
            "choices": [
                {
                    "message": {
                        "content": (
                            '{"name":"Jacket",'
                            '"category":"Fashion",'
                            '"short_description":"Short",'
                            '"description":"Description",'
                            '"seo_title":"Jacket | Shop",'
                            '"seo_description":"Buy jacket",'
                            '"selling_points":["Quality"],'
                            '"keywords":["jacket"],'
                            '"visual_attributes":{"color":"black"},'
                            '"uncertain_attributes":[],'
                            '"ai_summary":"A jacket",'
                            '"confidence":0.9}'
                        )
                    }
                }
            ]
        }

        service = ProductVisionService()
        result = service.analyze(
            images=[("jacket.jpg", b"image")],
            owner_facts={"price": "2500"},
            business_context={"business": {"name": "Test"}},
        )

        self.assertEqual(result["name"], "Jacket")
        self.assertEqual(result["category"], "Fashion")
        self.assertEqual(result["color"], "black")
        self.assertEqual(result["confidence"], 0.9)
        mock_provider.chat.assert_called_once()
        request = mock_provider.chat.call_args.kwargs
        self.assertEqual(request["response_format"], {"type": "json_object"})
        self.assertEqual(
            request["messages"][1]["content"][1]["type"],
            "image_url",
        )
        self.assertEqual(request["reasoning"], {"effort": "low"})

    @patch(
        "apps.commerce.services.product_vision.OpenRouterService"
    )
    def test_broken_json_with_a_line_break_is_still_read(
        self, MockOpenRouterService,
    ):
        mock_provider = MockOpenRouterService.return_value
        mock_provider.chat.return_value = {
            "choices": [
                {
                    "finish_reason": "length",
                    "message": {
                        "content": (
                            '{\n'
                            '  "name": "Royal Blue Velvet Loveseat",\n'
                            '  "category": "Loveseats",\n'
                            '  "short_description": "A royal blue velvet loveseat\n'
                            'with studded trim."\n'
                            "}"
                        )
                    },
                }
            ]
        }

        result = ProductVisionService().analyze(
            images=[("sofa.jpg", b"image")],
            owner_facts={"price": "4000"},
            business_context={"business": {"name": "Test"}},
        )

        self.assertEqual(result["name"], "Royal Blue Velvet Loveseat")
        self.assertIn("studded trim", result["short_description"])
        mock_provider.chat.assert_called_once()

    @patch(
        "apps.commerce.services.product_vision.OpenRouterService"
    )
    def test_invalid_json_is_retried_once(
        self, MockOpenRouterService,
    ):
        mock_provider = MockOpenRouterService.return_value
        valid = (
            '{"name":"Jacket","category":"Jackets",'
            '"short_description":"Short","description":"Description",'
            '"seo_title":"Jacket","seo_description":"Buy jacket",'
            '"selling_points":[],"keywords":[],'
            '"visual_attributes":{},"uncertain_attributes":[],'
            '"ai_summary":"A jacket","confidence":0.8}'
        )
        mock_provider.chat.side_effect = [
            {"choices": [{"message": {"content": "not json"}}]},
            {"choices": [{"message": {"content": valid}}]},
        ]

        result = ProductVisionService().analyze(
            images=[("jacket.jpg", b"image")],
            owner_facts={"price": "2500"},
            business_context={"business": {"name": "Test"}},
        )

        self.assertEqual(result["name"], "Jacket")
        self.assertEqual(mock_provider.chat.call_count, 2)

    def test_store_logo_in_context_does_not_break_the_prompt(self):
        from django.db import models
        from django.db.models.fields.files import FieldFile

        logo_field = models.ImageField(name="logo")

        class Page:
            pass

        page = Page()
        logo = FieldFile(page, logo_field, "commerce/storefront/logo.jpg")
        content = ProductVisionService()._build_user_content(
            images=[("hat.jpg", b"image")],
            owner_facts={"price": "1200"},
            business_context={"commerce_page": {"logo": logo, "title": "KOVA"}},
        )
        text = content[0]["text"]
        self.assertIn("logo.jpg", text)
        self.assertIn("KOVA", text)
