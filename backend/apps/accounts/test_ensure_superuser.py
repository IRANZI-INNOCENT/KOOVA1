import os
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase


User = get_user_model()


class EnsureSuperuserTests(TestCase):
    def test_creates_superuser_from_env(self):
        env = {
            "KOVA_SUPERUSER_EMAIL": "Admin@Example.com",
            "KOVA_SUPERUSER_PASSWORD": "a-very-long-deploy-secret",
            "KOVA_SUPERUSER_OPTIONAL": "1",
            "DJANGO_SETTINGS_MODULE": "config.settings.development",
        }
        with patch.dict(os.environ, env, clear=False):
            out = StringIO()
            call_command("ensure_superuser", stdout=out)

        user = User.objects.get(email="admin@example.com")
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_active)
        self.assertTrue(user.check_password("a-very-long-deploy-secret"))
        self.assertIn("Created superuser", out.getvalue())

    def test_upgrades_existing_user_and_syncs_password(self):
        User.objects.create_user(
            email="owner@example.com",
            password="old-password-here",
            first_name="Old",
            last_name="Name",
        )
        env = {
            "KOVA_SUPERUSER_EMAIL": "owner@example.com",
            "KOVA_SUPERUSER_PASSWORD": "brand-new-deploy-secret",
            "KOVA_SUPERUSER_OPTIONAL": "1",
            "DJANGO_SETTINGS_MODULE": "config.settings.development",
        }
        with patch.dict(os.environ, env, clear=False):
            out = StringIO()
            call_command("ensure_superuser", stdout=out)

        user = User.objects.get(email="owner@example.com")
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.check_password("brand-new-deploy-secret"))
        self.assertIn("password", out.getvalue())

    def test_accepts_django_superuser_aliases(self):
        env = {
            "KOVA_SUPERUSER_EMAIL": "",
            "KOVA_SUPERUSER_PASSWORD": "",
            "DJANGO_SUPERUSER_EMAIL": "alias@example.com",
            "DJANGO_SUPERUSER_PASSWORD": "alias-password-ok",
            "KOVA_SUPERUSER_OPTIONAL": "1",
            "DJANGO_SETTINGS_MODULE": "config.settings.development",
        }
        with patch.dict(os.environ, env, clear=False):
            call_command("ensure_superuser", stdout=StringIO())

        self.assertTrue(
            User.objects.get(email="alias@example.com").check_password(
                "alias-password-ok",
            ),
        )

    def test_short_password_fails(self):
        env = {
            "KOVA_SUPERUSER_EMAIL": "short@example.com",
            "KOVA_SUPERUSER_PASSWORD": "tooshort",
            "KOVA_SUPERUSER_OPTIONAL": "1",
            "DJANGO_SETTINGS_MODULE": "config.settings.development",
        }
        with patch.dict(os.environ, env, clear=False):
            with self.assertRaises(CommandError):
                call_command("ensure_superuser", stdout=StringIO())

    def test_production_requires_env_unless_optional(self):
        env = {
            "DJANGO_SETTINGS_MODULE": "config.settings.production",
            "KOVA_SUPERUSER_OPTIONAL": "",
        }
        for key in (
            "KOVA_SUPERUSER_EMAIL",
            "KOVA_SUPERUSER_PASSWORD",
            "DJANGO_SUPERUSER_EMAIL",
            "DJANGO_SUPERUSER_PASSWORD",
        ):
            os.environ.pop(key, None)
        with patch.dict(os.environ, env, clear=False):
            with self.assertRaises(CommandError) as ctx:
                call_command("ensure_superuser", stdout=StringIO())
        self.assertIn("must both be set", str(ctx.exception))

    def test_production_force_syncs_password_by_default(self):
        User.objects.create_user(
            email="force@example.com",
            password="old-password-here",
            first_name="Force",
            last_name="Sync",
        )
        env = {
            "KOVA_SUPERUSER_EMAIL": "force@example.com",
            "KOVA_SUPERUSER_PASSWORD": "brand-new-deploy-secret",
            "KOVA_SUPERUSER_OPTIONAL": "1",
            "KOVA_SUPERUSER_FORCE_PASSWORD": "",
            "DJANGO_SETTINGS_MODULE": "config.settings.production",
            "RAILWAY_ENVIRONMENT": "production",
        }
        with patch.dict(os.environ, env, clear=False):
            call_command("ensure_superuser", stdout=StringIO())

        user = User.objects.get(email="force@example.com")
        self.assertTrue(user.check_password("brand-new-deploy-secret"))
        self.assertTrue(user.is_superuser)
