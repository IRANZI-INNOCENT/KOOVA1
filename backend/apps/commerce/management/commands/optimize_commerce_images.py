"""
Re-encode existing commerce images (banners, logos, product photos) to WebP.

Usage:
  python manage.py optimize_commerce_images
  python manage.py optimize_commerce_images --dry-run
"""

from __future__ import annotations

from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand

from apps.commerce.models import CommercePage, CommercePageBanner, ProductImage
from apps.commerce.services.image_optimize import (
    BANNER_MAX_SIDE,
    LOGO_MAX_SIDE,
    PRODUCT_MAX_SIDE,
    optimize_upload,
)


class Command(BaseCommand):
    help = "Compress existing storefront/product images to WebP for faster loads."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing files.",
        )

    def handle(self, *args, **options):
        dry = options["dry_run"]
        changed = 0

        for banner in CommercePageBanner.objects.exclude(image="").iterator():
            if self._rewrite(banner, "image", BANNER_MAX_SIDE, dry):
                changed += 1

        for page in CommercePage.objects.all().iterator():
            if page.logo and self._rewrite(page, "logo", LOGO_MAX_SIDE, dry):
                changed += 1
            if page.cover and self._rewrite(page, "cover", BANNER_MAX_SIDE, dry):
                changed += 1

        for photo in ProductImage.objects.exclude(image="").iterator():
            if self._rewrite(photo, "image", PRODUCT_MAX_SIDE, dry):
                changed += 1

        verb = "Would optimize" if dry else "Optimized"
        self.stdout.write(self.style.SUCCESS(f"{verb} {changed} image(s)."))

    def _rewrite(self, instance, field_name: str, max_side: int, dry: bool) -> bool:
        field = getattr(instance, field_name)
        if not field:
            return False
        try:
            field.open("rb")
            raw = field.read()
            field.close()
        except Exception as exc:
            self.stderr.write(f"Skip {instance}: {exc}")
            return False

        name = field.name.rsplit("/", 1)[-1]
        if name.lower().endswith(".webp") and len(raw) < 180_000:
            return False

        upload = SimpleUploadedFile(name, raw)
        result = optimize_upload(upload, max_side=max_side)
        if not isinstance(result, ContentFile):
            return False
        if dry:
            new_size = getattr(result, "size", None) or len(result)
            self.stdout.write(
                f"  would rewrite {field.name} ({len(raw)} → ~{new_size} bytes)"
            )
            return True

        old = field.name
        field.save(result.name, result, save=False)
        instance.save(update_fields=[field_name])
        if old and old != field.name:
            try:
                field.storage.delete(old)
            except Exception:
                pass
        self.stdout.write(f"  rewrote {old} → {field.name}")
        return True
