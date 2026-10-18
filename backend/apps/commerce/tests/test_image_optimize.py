"""Unit tests for commerce image optimization."""

from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from PIL import Image

from apps.commerce.services.image_optimize import optimize_upload


def _png_bytes(width=800, height=600, color=(20, 120, 80)) -> bytes:
    buf = BytesIO()
    Image.new("RGB", (width, height), color).save(buf, format="PNG")
    return buf.getvalue()


class ImageOptimizeTests(SimpleTestCase):
    def test_large_png_becomes_smaller_webp(self):
        raw = _png_bytes(1600, 1200)
        upload = SimpleUploadedFile("promo.png", raw, content_type="image/png")
        result = optimize_upload(upload, max_side=800)
        self.assertTrue(result.name.lower().endswith(".webp"))
        self.assertLess(len(result.read()), len(raw))

    def test_svg_passthrough(self):
        upload = SimpleUploadedFile(
            "mark.svg",
            b'<svg xmlns="http://www.w3.org/2000/svg"/>',
            content_type="image/svg+xml",
        )
        result = optimize_upload(upload, max_side=512)
        self.assertIs(result, upload)
