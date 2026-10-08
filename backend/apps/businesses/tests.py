from django.contrib.auth import get_user_model
from django.test import TestCase

from rest_framework import status
from rest_framework.test import APITestCase

from .models import Business


User = get_user_model()


class BusinessModelTests(TestCase):
    """
    Test the Kova Business model.

    These tests verify the core ownership relationship, business data,
    timestamps, and the distinction between user authentication email
    and business contact email.
    """

    def setUp(self):
        """
        Create a reusable test user.

        Each test gets a fresh database, so this user is isolated
        from other tests.
        """
        self.user = User.objects.create_user(
            email="owner@example.com",
            password="StrongPassword123!",
            first_name="Business",
            last_name="Owner",
        )

    def test_business_can_be_created(self):
        """A valid business should be created successfully."""

        business = Business.objects.create(
            owner=self.user,
            name="Kova Shoes",
            description="Affordable shoes for everyday customers.",
            industry="Fashion",
            location="Nairobi, Kenya",
            email="business@example.com",
            phone="+254700000000",
        )

        self.assertEqual(
            Business.objects.count(),
            1,
        )

        self.assertEqual(
            business.name,
            "Kova Shoes",
        )

    def test_business_belongs_to_correct_owner(self):
        """The business should be connected to its creating user."""

        business = Business.objects.create(
            owner=self.user,
            name="Kova Shoes",
        )

        self.assertEqual(
            business.owner,
            self.user,
        )

        self.assertIn(
            business,
            self.user.owned_businesses.all(),
        )

    def test_user_can_own_multiple_businesses(self):
        """A user should be able to manage more than one business."""

        first_business = Business.objects.create(
            owner=self.user,
            name="Kova Shoes",
        )

        second_business = Business.objects.create(
            owner=self.user,
            name="Kova Fashion",
        )

        self.assertEqual(
            self.user.owned_businesses.count(),
            2,
        )

        self.assertIn(
            first_business,
            self.user.owned_businesses.all(),
        )

        self.assertIn(
            second_business,
            self.user.owned_businesses.all(),
        )

    def test_business_can_use_owner_login_email(self):
        """
        A business may use the same email as its owner's login email.

        User.email identifies the Kova account, while Business.email
        represents customer-facing business contact information.
        """

        business = Business.objects.create(
            owner=self.user,
            name="Owner's Business",
            email=self.user.email,
        )

        self.assertEqual(
            business.email,
            self.user.email,
        )

    def test_business_string_representation(self):
        """The business should be represented by its name."""

        business = Business.objects.create(
            owner=self.user,
            name="Kova Shoes",
        )

        self.assertEqual(
            str(business),
            "Kova Shoes",
        )

    def test_business_timestamps_are_created(self):
        """Business creation should automatically record timestamps."""

        business = Business.objects.create(
            owner=self.user,
            name="Kova Shoes",
        )

        self.assertIsNotNone(
            business.created_at,
        )

        self.assertIsNotNone(
            business.updated_at,
        )

    def test_deleting_owner_deletes_business(self):
        """
        Deleting the owner should delete their businesses.

        This follows the CASCADE rule defined on Business.owner.
        """

        business = Business.objects.create(
            owner=self.user,
            name="Kova Shoes",
        )

        business_id = business.id

        self.user.delete()

        self.assertFalse(
            Business.objects.filter(
                id=business_id,
            ).exists()
        )

from rest_framework import status
from rest_framework.test import APITestCase


class BusinessCreateAPITests(APITestCase):
    """
    Test the Business creation API.

    These tests verify that only authenticated users can create
    businesses and that the server correctly assigns ownership.
    """

    business_url = "/api/businesses/"

    def setUp(self):
        """
        Create a test user for authenticated API requests.
        """

        self.user = User.objects.create_user(
            email="business@example.com",
            password="StrongPassword123!",
            first_name="Business",
            last_name="Owner",
        )

        # Authenticate the API client as our test user.
        self.client.force_authenticate(
            user=self.user,
        )

    def test_authenticated_user_can_create_business(self):
        """
        An authenticated user should be able to create a business.
        """

        payload = {
            "name": "Kova Shoes",
            "description": "Affordable shoes for everyday customers.",
            "industry": "Fashion",
            "location": "Nairobi, Kenya",
            "email": "business@example.com",
            "phone": "+254700000000",
        }

        response = self.client.post(
            self.business_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertEqual(
            Business.objects.count(),
            1,
        )

        business = Business.objects.get(
            name="Kova Shoes",
        )

        self.assertEqual(
            business.owner,
            self.user,
        )

    def test_business_owner_cannot_be_supplied_by_client(self):
        """
        The API must determine ownership from authentication rather
        than trusting an owner value supplied by the client.
        """

        second_user = User.objects.create_user(
            email="other@example.com",
            password="StrongPassword123!",
            first_name="Other",
            last_name="User",
        )

        payload = {
            "name": "Unauthorized Business",
            "owner": second_user.id,
        }

        response = self.client.post(
            self.business_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        business = Business.objects.get(
            name="Unauthorized Business",
        )

        # The authenticated user must remain the owner.
        self.assertEqual(
            business.owner,
            self.user,
        )

        self.assertNotEqual(
            business.owner,
            second_user,
        )

    def test_unauthenticated_user_cannot_create_business(self):
        """
        Business creation must require authentication.
        """

        self.client.force_authenticate(
            user=None,
        )

        payload = {
            "name": "Unauthorized Business",
        }

        response = self.client.post(
            self.business_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

        self.assertEqual(
            Business.objects.count(),
            0,
        )

    def test_business_can_use_owner_login_email(self):
        """
        A business can use the owner's login email as its public
        business contact email.
        """

        payload = {
            "name": "Owner Business",
            "email": self.user.email,
        }

        response = self.client.post(
            self.business_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        business = Business.objects.get(
            name="Owner Business",
        )

        self.assertEqual(
            business.email,
            self.user.email,
        )

    def test_authenticated_user_can_list_owned_businesses(self):
        """
        An authenticated user should receive the businesses they own.
        """
        Business.objects.create(
            owner=self.user,
            name="Business One",
        )

        Business.objects.create(
            owner=self.user,
            name="Business Two",
        )

        response = self.client.get(
            "/api/businesses/",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data),
            2,
        )

        business_names = {
            business["name"]
            for business in response.data
        }

        self.assertEqual(
            business_names,
            {
                "Business One",
                "Business Two",
            },
        )

    def test_user_cannot_see_another_users_businesses(self):
        """
        A user's business list must never expose businesses owned
        by another Kova account.
        """
        Business.objects.create(
            owner=self.user,
            name="My Business",
        )

        other_user = User.objects.create_user(
            email="other@example.com",
            password="StrongPassword123!",
            first_name="Other",
            last_name="User",
        )

        Business.objects.create(
            owner=other_user,
            name="Other Business",
        )

        response = self.client.get(
            "/api/businesses/",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        business_names = {
            business["name"]
            for business in response.data
        }

        self.assertIn(
            "My Business",
            business_names,
        )

        self.assertNotIn(
            "Other Business",
            business_names,
        )

    def test_unauthenticated_user_cannot_list_businesses(self):
        """
        Business information must only be accessible to authenticated
        Kova users.
        """
        self.client.force_authenticate(
            user=None,
        )

        response = self.client.get(
            "/api/businesses/",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

def test_authenticated_user_can_retrieve_owned_business(self):
    """
    An authenticated user should be able to retrieve a business
    that they own.
    """
    business = Business.objects.create(
        owner=self.user,
        name="My Business",
    )

    response = self.client.get(
        f"/api/businesses/{business.id}/",
    )

    self.assertEqual(
        response.status_code,
        status.HTTP_200_OK,
    )

    self.assertEqual(
        response.data["id"],
        business.id,
    )

    self.assertEqual(
        response.data["name"],
        "My Business",
    )


def test_user_cannot_retrieve_another_users_business(self):
    """
    A user must not be able to retrieve another user's business.

    The API returns 404 so that the existence of another user's
    business is not exposed.
    """
    other_user = User.objects.create_user(
        email="other@example.com",
        password="StrongPassword123!",
        first_name="Other",
        last_name="User",
    )

    business = Business.objects.create(
        owner=other_user,
        name="Other Business",
    )

    response = self.client.get(
        f"/api/businesses/{business.id}/",
    )

    self.assertEqual(
        response.status_code,
        status.HTTP_404_NOT_FOUND,
    )


def test_unauthenticated_user_cannot_retrieve_business(self):
    """
    Business details require authentication.
    """
    business = Business.objects.create(
        owner=self.user,
        name="Private Business",
    )

    self.client.force_authenticate(
        user=None,
    )

    response = self.client.get(
        f"/api/businesses/{business.id}/",
    )

    self.assertEqual(
        response.status_code,
        status.HTTP_401_UNAUTHORIZED,
    )