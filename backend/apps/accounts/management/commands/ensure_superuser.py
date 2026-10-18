"""
Ensure a Django superuser exists for production deploys.

Railway preDeploy runs this after migrate. Env vars (API service):

  KOVA_SUPERUSER_EMAIL / DJANGO_SUPERUSER_EMAIL
  KOVA_SUPERUSER_PASSWORD / DJANGO_SUPERUSER_PASSWORD
  KOVA_SUPERUSER_FORCE_PASSWORD=1  — reset password on every deploy
  KOVA_SUPERUSER_OPTIONAL=1       — allow skip when email/password unset
                                   (default in production: required)
"""

from __future__ import annotations

import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


def _env(*names: str, default: str = "") -> str:
    for name in names:
        value = os.getenv(name)
        if value is not None and str(value).strip() != "":
            return str(value)
    return default


def _truthy(raw: str) -> bool:
    return raw.strip().lower() in ("1", "true", "yes", "on")


def _running_in_production() -> bool:
    settings_module = os.getenv("DJANGO_SETTINGS_MODULE", "")
    if "production" in settings_module:
        return True
    return bool(
        os.getenv("RAILWAY_ENVIRONMENT")
        or os.getenv("RAILWAY_SERVICE_NAME")
        or os.getenv("RAILWAY_PROJECT_ID")
    )


class Command(BaseCommand):
    help = (
        "Ensure a Django superuser exists from KOVA_SUPERUSER_EMAIL and "
        "KOVA_SUPERUSER_PASSWORD (Railway preDeploy)."
    )

    def handle(self, *args, **options):
        email = _env(
            "KOVA_SUPERUSER_EMAIL",
            "DJANGO_SUPERUSER_EMAIL",
        ).strip().lower()
        # Do not strip interior spaces from passwords; only trim newlines
        # that secret managers sometimes append.
        password = _env(
            "KOVA_SUPERUSER_PASSWORD",
            "DJANGO_SUPERUSER_PASSWORD",
        ).strip("\r\n")
        force_password = _truthy(
            _env("KOVA_SUPERUSER_FORCE_PASSWORD", "DJANGO_SUPERUSER_FORCE_PASSWORD"),
        )
        optional = _truthy(_env("KOVA_SUPERUSER_OPTIONAL"))
        required = _running_in_production() and not optional

        if not email or not password:
            message = (
                "KOVA_SUPERUSER_EMAIL and KOVA_SUPERUSER_PASSWORD must both be "
                "set on the API service (DJANGO_SUPERUSER_* aliases accepted)."
            )
            if required:
                raise CommandError(
                    f"{message} Set KOVA_SUPERUSER_OPTIONAL=1 to skip on purpose.",
                )
            self.stdout.write(self.style.WARNING(f"Skipping superuser sync — {message}"))
            return

        if len(password) < 12:
            raise CommandError(
                "KOVA_SUPERUSER_PASSWORD must be at least 12 characters.",
            )

        User = get_user_model()
        first = (
            _env("KOVA_SUPERUSER_FIRST_NAME", "DJANGO_SUPERUSER_FIRST_NAME", default="Kova")
            .strip()
            or "Kova"
        )
        last = (
            _env("KOVA_SUPERUSER_LAST_NAME", "DJANGO_SUPERUSER_LAST_NAME", default="Admin")
            .strip()
            or "Admin"
        )

        try:
            validate_password(password)
        except ValidationError as exc:
            raise CommandError(
                "KOVA_SUPERUSER_PASSWORD failed Django validation: "
                + "; ".join(exc.messages),
            ) from exc

        with transaction.atomic():
            user = User.objects.filter(email__iexact=email).first()
            created = user is None

            if created:
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

            changed_fields: list[str] = []
            if not user.is_staff:
                user.is_staff = True
                changed_fields.append("is_staff")
            if not user.is_superuser:
                user.is_superuser = True
                changed_fields.append("is_superuser")
            if not user.is_active:
                user.is_active = True
                changed_fields.append("is_active")
            if first and user.first_name != first:
                user.first_name = first
                changed_fields.append("first_name")
            if last and user.last_name != last:
                user.last_name = last
                changed_fields.append("last_name")

            # Existing signup accounts often share this email with a different
            # password. Reset when forced, or when the stored password does
            # not match the deploy secret (so the Railway password always works).
            password_matches = user.check_password(password)
            should_reset = force_password or not password_matches
            if should_reset:
                user.set_password(password)
                changed_fields.append("password")

            if changed_fields:
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Updated superuser {email} ({', '.join(changed_fields)}).",
                    ),
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f"Superuser {email} already exists and is up to date.",
                    ),
                )
