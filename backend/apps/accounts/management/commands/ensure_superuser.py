import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        "Ensure a Django superuser exists from KOVA_SUPERUSER_EMAIL and "
        "KOVA_SUPERUSER_PASSWORD (used on Railway deploy)."
    )

    def handle(self, *args, **options):
        email = os.getenv("KOVA_SUPERUSER_EMAIL", "").strip().lower()
        password = os.getenv("KOVA_SUPERUSER_PASSWORD", "")
        force_password = os.getenv(
            "KOVA_SUPERUSER_FORCE_PASSWORD",
            "",
        ).strip().lower() in ("1", "true", "yes")

        if not email or not password:
            self.stdout.write(
                "Skipping superuser sync (KOVA_SUPERUSER_EMAIL / "
                "KOVA_SUPERUSER_PASSWORD not set).",
            )
            return

        if len(password) < 12:
            self.stderr.write(
                self.style.ERROR(
                    "KOVA_SUPERUSER_PASSWORD must be at least 12 characters.",
                ),
            )
            return

        User = get_user_model()
        first = os.getenv("KOVA_SUPERUSER_FIRST_NAME", "Kova").strip() or "Kova"
        last = os.getenv("KOVA_SUPERUSER_LAST_NAME", "Admin").strip() or "Admin"

        user = User.objects.filter(email=email).first()
        if user is None:
            user = User.objects.create_superuser(
                email=email,
                password=password,
                first_name=first,
                last_name=last,
            )
            self.stdout.write(
                self.style.SUCCESS(f"Created superuser {email}"),
            )
            return

        user.is_staff = True
        user.is_superuser = True
        user.first_name = first or user.first_name
        user.last_name = last or user.last_name

        if force_password:
            user.set_password(password)
            self.stdout.write(
                self.style.SUCCESS(
                    f"Updated superuser {email} (password reset).",
                ),
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Superuser {email} already exists (password unchanged).",
                ),
            )

        user.save()
