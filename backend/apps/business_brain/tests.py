from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.businesses.models import Business
from .models import BusinessAudience, BusinessProfile

from .models import BusinessProfile


User = get_user_model()


class BusinessProfileModelTests(TestCase):
    """
    Test the BusinessProfile model and its relationship with Business.

    These tests protect the Business Brain foundation before the model
    is exposed through the API.
    """

    @classmethod
    def setUpTestData(cls):
        """
        Create reusable database records for the model tests.
        """

        cls.user = User.objects.create_user(
            email="owner@example.com",
            password="StrongPassword123!",
            first_name="Test",
            last_name="Owner",
        )

        cls.business = Business.objects.create(
            owner=cls.user,
            name="Test Business",
            description="A test business for Kova.",
            industry="Retail",
            location="Nairobi",
            email="business@example.com",
            phone="+254700000000",
        )

    def test_profile_can_be_created_for_business(self):
        """A business should be able to have one BusinessProfile."""

        profile = BusinessProfile.objects.create(
            business=self.business,
            mission="Make quality products accessible.",
            value_proposition="Quality products at fair prices.",
            target_market="Young professionals in Kenya.",
            business_model="Retail",
            business_stage="Growing",
            website="https://example.com",
        )

        self.assertEqual(
            profile.business,
            self.business,
        )

        self.assertEqual(
            profile.mission,
            "Make quality products accessible.",
        )

    def test_business_can_access_its_profile(self):
        """
        The Business model should expose its profile through the
        related_name configured on the OneToOneField.
        """

        profile = BusinessProfile.objects.create(
            business=self.business,
            mission="Help customers find better products.",
        )

        self.assertEqual(
            self.business.profile,
            profile,
        )

    def test_business_can_have_only_one_profile(self):
        """
        A business must not have multiple BusinessProfile records.
        """

        BusinessProfile.objects.create(
            business=self.business,
            mission="First profile.",
        )

        with self.assertRaises(IntegrityError):
            BusinessProfile.objects.create(
                business=self.business,
                mission="Second profile.",
            )

    def test_deleting_business_deletes_profile(self):
        """
        Deleting a Business should delete its BusinessProfile.
        """

        profile = BusinessProfile.objects.create(
            business=self.business,
            mission="Business profile.",
        )

        profile_id = profile.id

        self.business.delete()

        self.assertFalse(
            BusinessProfile.objects.filter(
                id=profile_id,
            ).exists()
        )

    def test_profile_string_representation(self):
        """The profile string representation should identify its business."""

        profile = BusinessProfile.objects.create(
            business=self.business,
        )

        self.assertEqual(
            str(profile),
            "Test Business profile",
        )

    def test_optional_fields_can_be_empty(self):
        """
        BusinessProfile should allow incomplete information because
        Kova will progressively learn more about a business over time.
        """

        profile = BusinessProfile.objects.create(
            business=self.business,
        )

        self.assertEqual(profile.mission, "")
        self.assertEqual(profile.value_proposition, "")
        self.assertEqual(profile.target_market, "")
        self.assertEqual(profile.business_model, "")
        self.assertEqual(profile.business_stage, "")
        self.assertEqual(profile.website, "")


class BusinessProfileAPITests(TestCase):
    """
    Test the Business Profile API.

    These tests verify authentication, ownership isolation, automatic
    profile creation and partial updates.
    """

    def setUp(self):
        """
        Create users, businesses and an authenticated API client.
        """

        self.client = APIClient()

        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="StrongPassword123!",
            first_name="Business",
            last_name="Owner",
        )

        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="StrongPassword123!",
            first_name="Other",
            last_name="User",
        )

        self.business = Business.objects.create(
            owner=self.owner,
            name="Owner Business",
            description="Business owned by the test owner.",
            industry="Retail",
            location="Nairobi",
        )

        self.other_business = Business.objects.create(
            owner=self.other_user,
            name="Other Business",
            description="Business owned by another user.",
            industry="Technology",
            location="Nairobi",
        )

        self.url = (
            f"/api/business-brain/"
            f"{self.business.id}/profile/"
        )

    def authenticate_as_owner(self):
        """
        Authenticate the API client as the business owner.
        """

        self.client.force_authenticate(
            user=self.owner,
        )

    def test_unauthenticated_user_cannot_access_profile(self):
        """
        Unauthenticated requests must not access Business Brain data.
        """

        response = self.client.get(
            self.url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_owner_can_get_profile(self):
        """
        The business owner should be able to retrieve their profile.
        """

        self.authenticate_as_owner()

        BusinessProfile.objects.create(
            business=self.business,
            mission="Help customers discover quality products.",
            target_market="Young professionals.",
        )

        response = self.client.get(
            self.url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["business"],
            self.business.id,
        )

        self.assertEqual(
            response.data["mission"],
            "Help customers discover quality products.",
        )

    def test_profile_is_created_automatically_when_missing(self):
        """
        GET should create an empty profile when the business does not
        have one yet.

        This supports Kova's progressive Business Brain architecture.
        """

        self.authenticate_as_owner()

        self.assertFalse(
            BusinessProfile.objects.filter(
                business=self.business,
            ).exists()
        )

        response = self.client.get(
            self.url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            BusinessProfile.objects.filter(
                business=self.business,
            ).exists()
        )

    def test_owner_can_update_profile(self):
        """
        The business owner should be able to partially update the profile.
        """

        self.authenticate_as_owner()

        response = self.client.patch(
            self.url,
            {
                "mission": "Make quality products accessible.",
                "target_market": "Young professionals in Kenya.",
                "business_stage": "Growing",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        profile = BusinessProfile.objects.get(
            business=self.business,
        )

        self.assertEqual(
            profile.mission,
            "Make quality products accessible.",
        )

        self.assertEqual(
            profile.target_market,
            "Young professionals in Kenya.",
        )

        self.assertEqual(
            profile.business_stage,
            "Growing",
        )

    def test_partial_update_does_not_overwrite_other_fields(self):
        """
        PATCH should update only the supplied fields.
        """

        self.authenticate_as_owner()

        BusinessProfile.objects.create(
            business=self.business,
            mission="Original mission.",
            value_proposition="Original value proposition.",
            target_market="Original target market.",
        )

        response = self.client.patch(
            self.url,
            {
                "mission": "Updated mission.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        profile = BusinessProfile.objects.get(
            business=self.business,
        )

        self.assertEqual(
            profile.mission,
            "Updated mission.",
        )

        self.assertEqual(
            profile.value_proposition,
            "Original value proposition.",
        )

        self.assertEqual(
            profile.target_market,
            "Original target market.",
        )

    def test_user_cannot_access_another_users_business_profile(self):
        """
        A user must not be able to access another user's Business Brain.

        The API intentionally returns 404 rather than revealing that
        another user's business exists.
        """

        self.client.force_authenticate(
            user=self.owner,
        )

        other_business_url = (
            f"/api/business-brain/"
            f"{self.other_business.id}/profile/"
        )

        response = self.client.get(
            other_business_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_user_cannot_update_another_users_business_profile(self):
        """
        Ownership isolation must also apply to updates.
        """

        self.client.force_authenticate(
            user=self.owner,
        )

        other_business_url = (
            f"/api/business-brain/"
            f"{self.other_business.id}/profile/"
        )

        response = self.client.patch(
            other_business_url,
            {
                "mission": "Unauthorized update.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.assertFalse(
            BusinessProfile.objects.filter(
                business=self.other_business,
                mission="Unauthorized update.",
            ).exists()
        )

    def test_business_id_cannot_be_changed_through_api(self):
        """
        The business relationship must remain read-only.

        Clients cannot move a BusinessProfile to another business by
        submitting a different business ID.
        """

        self.client.force_authenticate(
            user=self.owner,
        )

        profile = BusinessProfile.objects.create(
            business=self.business,
            mission="Original mission.",
        )

        response = self.client.patch(
            self.url,
            {
                "business": self.other_business.id,
                "mission": "Updated mission.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        profile.refresh_from_db()

        self.assertEqual(
            profile.business,
            self.business,
        )

        self.assertEqual(
            profile.mission,
            "Updated mission.",
        )


def test_business_audience_can_be_created(self):
    """
    A business should be able to store detailed customer context
    through its BusinessAudience profile.
    """
    audience = BusinessAudience.objects.create(
        business=self.business,
        primary_audience=(
            "Young adults and working professionals in Kenya "
            "interested in affordable natural skincare."
        ),
        customer_needs=(
            "Customers want affordable skincare products that "
            "are simple to understand and easy to use."
        ),
        pain_points=(
            "Customers may struggle to find affordable skincare "
            "products they can trust."
        ),
        buying_motivations=(
            "Customers are motivated by affordability, quality, "
            "natural ingredients, visible results, and convenience."
        ),
        customer_behavior=(
            "Customers discover products through Instagram, "
            "Facebook, recommendations, and WhatsApp."
        ),
        preferred_channels="Instagram, Facebook, WhatsApp",
    )

    self.assertEqual(
        audience.business,
        self.business,
    )

    self.assertEqual(
        audience.primary_audience,
        "Young adults and working professionals in Kenya "
        "interested in affordable natural skincare.",
    )


def test_business_can_access_audience(self):
    """
    The business should expose its audience through the related
    name configured on the OneToOneField.
    """
    BusinessAudience.objects.create(
        business=self.business,
    )

    self.assertEqual(
        self.business.audience.business,
        self.business,
    )


def test_business_can_have_only_one_audience(self):
    """
    Each business should have one audience profile in the current
    Business Brain architecture.
    """
    BusinessAudience.objects.create(
        business=self.business,
    )

    with self.assertRaises(IntegrityError):
        BusinessAudience.objects.create(
            business=self.business,
        )


def test_deleting_business_deletes_audience(self):
    """
    Deleting a business should also remove its BusinessAudience
    because the relationship uses CASCADE.
    """
    audience = BusinessAudience.objects.create(
        business=self.business,
    )

    audience_id = audience.id

    self.business.delete()

    self.assertFalse(
        BusinessAudience.objects.filter(
            id=audience_id,
        ).exists()
    )


def test_business_audience_string_representation(self):
    """
    The audience string representation should identify the
    associated business.
    """
    audience = BusinessAudience.objects.create(
        business=self.business,
    )

    self.assertEqual(
        str(audience),
        f"{self.business.name} audience",
    )


def test_business_audience_fields_can_be_empty(self):
    """
    Audience information should be optional because Kova should
    allow a business to progressively build its Business Brain.
    """
    audience = BusinessAudience.objects.create(
        business=self.business,
    )

    self.assertEqual(
        audience.primary_audience,
        "",
    )

    self.assertEqual(
        audience.customer_needs,
        "",
    )

    self.assertEqual(
        audience.pain_points,
        "",
    )

    self.assertEqual(
        audience.buying_motivations,
        "",
    )

    self.assertEqual(
        audience.customer_behavior,
        "",
    )

    self.assertEqual(
        audience.preferred_channels,
        "",
    )

def test_owner_can_get_business_audience(self):
    """
    The business owner should be able to retrieve the audience
    profile belonging to their business.
    """
    self.client.force_authenticate(user=self.user)

    response = self.client.get(
        f"/api/business-brain/{self.business.id}/audience/"
    )

    self.assertEqual(response.status_code, 200)
    self.assertEqual(
        response.data["business"],
        self.business.id,
    )


def test_audience_is_created_when_missing(self):
    """
    GET should automatically create an empty audience profile
    when the business does not have one yet.
    """
    self.client.force_authenticate(user=self.user)

    self.assertFalse(
        BusinessAudience.objects.filter(
            business=self.business,
        ).exists()
    )

    response = self.client.get(
        f"/api/business-brain/{self.business.id}/audience/"
    )

    self.assertEqual(response.status_code, 200)

    self.assertTrue(
        BusinessAudience.objects.filter(
            business=self.business,
        ).exists()
    )


def test_owner_can_update_business_audience(self):
    """
    The business owner should be able to update their audience
    information.
    """
    self.client.force_authenticate(user=self.user)

    response = self.client.patch(
        f"/api/business-brain/{self.business.id}/audience/",
        {
            "primary_audience": (
                "Young professionals in Nairobi interested "
                "in affordable skincare."
            ),
            "customer_needs": (
                "Affordable and simple skincare products."
            ),
            "pain_points": (
                "Expensive skincare products and confusing routines."
            ),
            "buying_motivations": (
                "Quality, affordability, natural ingredients, and trust."
            ),
            "customer_behavior": (
                "Customers discover products through Instagram "
                "and ask questions on WhatsApp."
            ),
            "preferred_channels": (
                "Instagram, Facebook, and WhatsApp"
            ),
        },
        format="json",
    )

    self.assertEqual(response.status_code, 200)

    audience = BusinessAudience.objects.get(
        business=self.business,
    )

    self.assertEqual(
        audience.primary_audience,
        "Young professionals in Nairobi interested in affordable skincare.",
    )


def test_partial_audience_update_does_not_overwrite_other_fields(self):
    """
    PATCH should update only the supplied fields and preserve
    existing audience information.
    """
    self.client.force_authenticate(user=self.user)

    BusinessAudience.objects.create(
        business=self.business,
        primary_audience="Young professionals",
        customer_needs="Affordable skincare",
        preferred_channels="Instagram",
    )

    response = self.client.patch(
        f"/api/business-brain/{self.business.id}/audience/",
        {
            "pain_points": "Expensive skincare products",
        },
        format="json",
    )

    self.assertEqual(response.status_code, 200)

    audience = BusinessAudience.objects.get(
        business=self.business,
    )

    self.assertEqual(
        audience.primary_audience,
        "Young professionals",
    )

    self.assertEqual(
        audience.customer_needs,
        "Affordable skincare",
    )

    self.assertEqual(
        audience.preferred_channels,
        "Instagram",
    )

    self.assertEqual(
        audience.pain_points,
        "Expensive skincare products",
    )


def test_user_cannot_access_another_users_audience(self):
    """
    A user must not be able to retrieve the audience belonging
    to another user's business.
    """
    other_user = User.objects.create_user(
        email="other@example.com",
        password="StrongPassword123!",
    )

    other_business = Business.objects.create(
        owner=other_user,
        name="Other Business",
    )

    self.client.force_authenticate(user=self.user)

    response = self.client.get(
        f"/api/business-brain/{other_business.id}/audience/"
    )

    self.assertEqual(response.status_code, 404)


def test_user_cannot_update_another_users_audience(self):
    """
    A user must not be able to modify the audience belonging
    to another user's business.
    """
    other_user = User.objects.create_user(
        email="other@example.com",
        password="StrongPassword123!",
    )

    other_business = Business.objects.create(
        owner=other_user,
        name="Other Business",
    )

    BusinessAudience.objects.create(
        business=other_business,
        primary_audience="Original audience",
    )

    self.client.force_authenticate(user=self.user)

    response = self.client.patch(
        f"/api/business-brain/{other_business.id}/audience/",
        {
            "primary_audience": "Malicious update",
        },
        format="json",
    )

    self.assertEqual(response.status_code, 404)

    audience = BusinessAudience.objects.get(
        business=other_business,
    )

    self.assertEqual(
        audience.primary_audience,
        "Original audience",
    )


def test_business_id_cannot_be_changed_through_audience_api(self):
    """
    Clients must not be able to move an audience profile to
    another business by submitting a different business ID.
    """
    self.client.force_authenticate(user=self.user)

    audience = BusinessAudience.objects.create(
        business=self.business,
    )

    other_user = User.objects.create_user(
        email="other@example.com",
        password="StrongPassword123!",
    )

    other_business = Business.objects.create(
        owner=other_user,
        name="Other Business",
    )

    response = self.client.patch(
        f"/api/business-brain/{self.business.id}/audience/",
        {
            "business": other_business.id,
            "primary_audience": "Updated audience",
        },
        format="json",
    )

    self.assertEqual(response.status_code, 200)

    audience.refresh_from_db()

    self.assertEqual(
        audience.business,
        self.business,
    )


def test_audience_requires_authentication(self):
    """
    Unauthenticated users must not access BusinessAudience.
    """
    response = self.client.get(
        f"/api/business-brain/{self.business.id}/audience/"
    )

    self.assertIn(
        response.status_code,
        [401, 403],
    )

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.business_brain.models import BusinessBrand


class BusinessBrandAPITests(APITestCase):
    """
    Test the Business Brand API.

    These tests verify authentication, ownership, automatic creation,
    updates, partial updates, persistence, and protection of the
    business relationship.
    """

    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="StrongPassword123!",
            first_name="Business",
            last_name="Owner",
        )

        self.other_user = User.objects.create_user(
            email="other@example.com",
            password="StrongPassword123!",
            first_name="Other",
            last_name="User",
        )

        self.business = Business.objects.create(
            owner=self.owner,
            name="Nia Naturals",
        )

        self.other_business = Business.objects.create(
            owner=self.other_user,
            name="Other Business",
        )

        self.url = reverse(
            "business-brain:business-brand",
            kwargs={"business_id": self.business.id},
        )

    def test_unauthenticated_user_cannot_access_brand(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_owner_can_get_brand(self):
        self.client.force_authenticate(
            user=self.owner,
        )

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["business"],
            self.business.id,
        )

        self.assertEqual(
            BusinessBrand.objects.filter(
                business=self.business,
            ).count(),
            1,
        )

    def test_get_automatically_creates_empty_brand(self):
        self.client.force_authenticate(
            user=self.owner,
        )

        self.assertFalse(
            BusinessBrand.objects.filter(
                business=self.business,
            ).exists()
        )

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        brand = BusinessBrand.objects.get(
            business=self.business,
        )

        self.assertEqual(
            brand.voice,
            "",
        )

        self.assertEqual(
            brand.tone,
            "",
        )

    def test_owner_can_update_brand(self):
        self.client.force_authenticate(
            user=self.owner,
        )

        payload = {
            "voice": "Helpful, confident and human.",
            "tone": "Warm and encouraging.",
            "positioning": (
                "Affordable natural skincare for everyday customers."
            ),
            "brand_personality": (
                "Friendly, trustworthy and practical."
            ),
            "content_style": (
                "Simple, educational and concise."
            ),
            "communication_preferences": (
                "Use plain language and focus on customer benefits."
            ),
        }

        response = self.client.patch(
            self.url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        brand = BusinessBrand.objects.get(
            business=self.business,
        )

        self.assertEqual(
            brand.voice,
            payload["voice"],
        )

        self.assertEqual(
            brand.tone,
            payload["tone"],
        )

        self.assertEqual(
            brand.positioning,
            payload["positioning"],
        )

        self.assertEqual(
            brand.brand_personality,
            payload["brand_personality"],
        )

        self.assertEqual(
            brand.content_style,
            payload["content_style"],
        )

        self.assertEqual(
            brand.communication_preferences,
            payload["communication_preferences"],
        )

    def test_partial_update_preserves_existing_fields(self):
        self.client.force_authenticate(
            user=self.owner,
        )

        BusinessBrand.objects.create(
            business=self.business,
            voice="Friendly and confident.",
            tone="Warm.",
            positioning="Affordable skincare.",
        )

        response = self.client.patch(
            self.url,
            {
                "tone": "Professional and reassuring.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        brand = BusinessBrand.objects.get(
            business=self.business,
        )

        self.assertEqual(
            brand.voice,
            "Friendly and confident.",
        )

        self.assertEqual(
            brand.tone,
            "Professional and reassuring.",
        )

        self.assertEqual(
            brand.positioning,
            "Affordable skincare.",
        )

    def test_user_cannot_access_another_users_business_brand(self):
        self.client.force_authenticate(
            user=self.other_user,
        )

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_user_cannot_update_another_users_business_brand(self):
        self.client.force_authenticate(
            user=self.other_user,
        )

        response = self.client.patch(
            self.url,
            {
                "voice": "Unauthorized change.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.assertFalse(
            BusinessBrand.objects.filter(
                business=self.business,
                voice="Unauthorized change.",
            ).exists()
        )

    def test_business_relationship_cannot_be_changed(self):
        self.client.force_authenticate(
            user=self.owner,
        )

        original_brand = BusinessBrand.objects.create(
            business=self.business,
            voice="Original voice.",
        )

        response = self.client.patch(
            self.url,
            {
                "business": self.other_business.id,
                "voice": "Updated voice.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        original_brand.refresh_from_db()

        self.assertEqual(
            original_brand.business_id,
            self.business.id,
        )

        self.assertEqual(
            original_brand.voice,
            "Updated voice.",
        )

        self.assertFalse(
            BusinessBrand.objects.filter(
                business=self.other_business,
            ).exists()
        )