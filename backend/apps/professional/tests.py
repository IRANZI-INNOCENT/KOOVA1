from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import ContentPillar, LinkedInConnection, ProfessionalProfile
from .services import linkedin as linkedin_service


class ProfessionalProfileTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            email="pro@test.com",
            password="test-pass-123",
            first_name="Pro",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_profile_created_on_get(self):
        response = self.client.get("/api/professional/profile/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            ProfessionalProfile.objects.filter(user=self.user).exists(),
        )

    def test_onboarding_choice(self):
        response = self.client.post(
            "/api/professional/onboarding/choice/",
            {"path": "linkedin"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        profile = ProfessionalProfile.objects.get(user=self.user)
        self.assertEqual(profile.onboarding_path, "linkedin")

    def test_profile_ready_requires_basics_and_pillar(self):
        from .services.profile_readiness import is_profile_ready

        profile, _ = ProfessionalProfile.objects.get_or_create(user=self.user)
        self.assertFalse(is_profile_ready(profile))
        profile.headline = "Builder in AI"
        profile.role_title = "Engineer"
        profile.save()
        self.assertFalse(is_profile_ready(profile))
        ContentPillar.objects.create(profile=profile, name="Agentic AI")
        self.assertTrue(is_profile_ready(profile))

    def test_pillar_limit(self):
        profile, _ = ProfessionalProfile.objects.get_or_create(user=self.user)
        for index in range(5):
            ContentPillar.objects.create(
                profile=profile,
                name=f"Pillar {index}",
            )
        response = self.client.post(
            "/api/professional/pillars/",
            {"name": "Sixth"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)


class LinkedInOAuthFlowTests(SimpleTestCase):
    def test_default_scopes_do_not_ask_for_offline_access(self):
        scopes = linkedin_service.oauth_scopes()
        self.assertIn("openid", scopes)
        self.assertIn("w_member_social", scopes)
        self.assertNotIn("offline_access", scopes)

    def test_callback_uri_stays_on_our_path(self):
        good = "https://ai.kcova.com/api/professional/linkedin/callback/"
        self.assertEqual(linkedin_service.accepted_callback_uri(good), good)
        self.assertEqual(
            linkedin_service.accepted_callback_uri("https://evil.test/api/steal/"),
            "",
        )
        self.assertEqual(
            linkedin_service.accepted_callback_uri("http://example.com/api/professional/linkedin/callback/"),
            "",
        )

    def test_state_round_trip_keeps_the_redirect_used_at_signin(self):
        uri = "https://ai.kcova.com/api/professional/linkedin/callback/"
        state = linkedin_service.build_oauth_state(profile_id=4, redirect_uri=uri)
        payload = linkedin_service.read_oauth_state(state)
        self.assertEqual(payload["profile_id"], 4)
        self.assertEqual(payload["redirect_uri"], uri)

    def test_cancelled_signin_uses_a_known_error_code(self):
        url = linkedin_service.connect_page_url(
            "https://ai.kcova.com",
            error="user_cancelled_login",
        )
        self.assertIn("error=access_denied", url)
        self.assertTrue(url.startswith("https://ai.kcova.com/workspace/linkedin/connect?"))

    def test_bind_address_is_not_a_browser_redirect(self):
        self.assertFalse(linkedin_service.is_public_origin("https://0.0.0.0:8080"))
        self.assertFalse(linkedin_service.is_public_origin("http://localhost:3000"))
        self.assertTrue(linkedin_service.is_public_origin("https://ai.kcova.com"))

    def test_redirect_uses_the_public_site_when_frontend_url_is_the_bind_address(self):
        from django.test import RequestFactory, override_settings

        request = RequestFactory().get(
            "/api/professional/linkedin/callback/",
            HTTP_X_KOVA_SITE_ORIGIN="https://ai.kcova.com",
        )
        with override_settings(FRONTEND_URL="https://0.0.0.0:8080"):
            self.assertEqual(
                linkedin_service.frontend_redirect_base(request),
                "https://ai.kcova.com",
            )

    def test_publish_uses_an_active_linkedin_version(self):
        version = linkedin_service.linkedin_api_version()
        self.assertEqual(len(version), 6)
        self.assertNotEqual(version, "202405")
        self.assertGreaterEqual(version, "202601")

    def test_linkedin_error_text_reads_the_message(self):
        class Response:
            text = '{"status":426,"code":"NONEXISTENT_VERSION","message":"Requested version 20240501 is not active"}'

            def json(self):
                return {
                    "status": 426,
                    "code": "NONEXISTENT_VERSION",
                    "message": "Requested version 20240501 is not active",
                }

        self.assertEqual(
            linkedin_service.linkedin_error_text(Response(), "LinkedIn publish failed."),
            "Requested version 20240501 is not active",
        )

    def test_parenthesis_does_not_cut_the_rest_of_a_post(self):
        source = (
            "1. Translating chaotic human inputs into clean, typed data "
            "(e.g., extracting SKU details from a handwritten scan).\n"
            "2. Ambiguous intent classification."
        )
        escaped = linkedin_service.commentary_for_linkedin(source)
        self.assertIn(r"\(e.g., extracting SKU details", escaped)
        self.assertIn("2. Ambiguous intent classification.", escaped)
        self.assertNotIn("data (e.g.", escaped)

    def test_plain_post_is_unchanged_when_it_has_no_reserved_characters(self):
        source = "Keep the core deterministic. Use AI only where ambiguity demands it."
        self.assertEqual(linkedin_service.escape_little_text(source), source)

    def test_past_expiry_reads_as_expired_without_a_write(self):
        connection = LinkedInConnection(
            connection_status=LinkedInConnection.Status.CONNECTED,
            token_expires_at=timezone.now() - timedelta(minutes=5),
        )
        self.assertEqual(
            linkedin_service.effective_connection_status(connection),
            LinkedInConnection.Status.EXPIRED,
        )
