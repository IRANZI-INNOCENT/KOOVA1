"""
Compress and normalize commerce uploads for fast storefront loads.

Converts to WebP (high quality) and caps dimensions so banners and product
photos stay sharp without shipping multi‑megabyte originals.
"""

from __future__ import annotations

import logging
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.files.uploadedfile import UploadedFile
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)

# Soft caps — keep detail, cut payload size hard.
BANNER_MAX_SIDE = 1920
PRODUCT_MAX_SIDE = 1600
LOGO_MAX_SIDE = 512
WEBP_QUALITY = 82
# Skip rework when already small enough (bytes) and WebP.
SKIP_UNDER_BYTES = 180_000


def optimize_upload(
    upload: UploadedFile,
    *,
    max_side: int,
    quality: int = WEBP_QUALITY,
) -> ContentFile | UploadedFile:
    """
    Return a WebP ContentFile when optimization helps; otherwise the original.
    Never raises to the caller — failures keep the original upload.
    """
    if not upload:
        return upload

    name = getattr(upload, "name", "") or "image"
    lower = name.lower()
    if lower.endswith((".svg", ".gif")):
        return upload

    try:
        raw = upload.read()
        if hasattr(upload, "seek"):
            upload.seek(0)
        if not raw:
            return upload

        # Already compact WebP — leave alone.
        if lower.endswith(".webp") and len(raw) <= SKIP_UNDER_BYTES:
            return upload

        image = Image.open(BytesIO(raw))
        image = ImageOps.exif_transpose(image)

        if getattr(image, "n_frames", 1) > 1:
            image.seek(0)

        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

        image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

        buffer = BytesIO()
        image.save(
            buffer,
            format="WEBP",
            quality=quality,
            method=4,
        )
        data = buffer.getvalue()

        # Keep original if somehow larger (rare for PNG/JPEG).
        if len(data) >= len(raw) * 0.95 and len(raw) <= SKIP_UNDER_BYTES * 2:
            if hasattr(upload, "seek"):
                upload.seek(0)
            return upload

        base = name.rsplit("/", 1)[-1].rsplit(".", 1)[0] or "image"
        safe = "".join(c if c.isalnum() or c in "-_" else "-" for c in base)[:80]
        return ContentFile(data, name=f"{safe or 'image'}.webp")
    except Exception:
        logger.exception("Commerce image optimize failed for %s", name)
        if hasattr(upload, "seek"):
            try:
                upload.seek(0)
            except Exception:
                pass
        return upload
