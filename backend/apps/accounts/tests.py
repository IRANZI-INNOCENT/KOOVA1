from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


class SignupAPITests(APITestCase):
    """Test the Kova user signup API."""

    signup_url = "/api/auth/signup/"

    def test_user_can_sign_up(self):
        """A valid signup request should create a new user."""

        payload = {
            "email": "newuser@example.com",
            "password": "StrongPassword123!",
            "first_name": "New",
            "last_name": "User",
        }

        response = self.client.post(
            self.signup_url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            User.objects.filter(email="newuser@example.com").exists()
        )

    def test_password_is_hashed(self):
        """Passwords must never be stored as plain text."""

        payload = {
            "email": "secure@example.com",
            "password": "StrongPassword123!",
            "first_name": "Secure",
            "last_name": "User",
        }

        response = self.client.post(
            self.signup_url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        user = User.objects.get(email="secure@example.com")
        self.assertNotEqual(user.password, "StrongPassword123!")
        self.assertTrue(user.check_password("StrongPassword123!"))

    def test_password_is_not_returned(self):
        """The signup response must never expose the password."""

        payload = {
            "email": "private@example.com",
            "password": "StrongPassword123!",
            "first_name": "Private",
            "last_name": "User",
        }

        response = self.client.post(
            self.signup_url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("password", response.data)

    def test_duplicate_email_is_rejected(self):
        """An email address can only belong to one Kova account."""

        User.objects.create_user(
            email="existing@example.com",
            password="Password123!",
            first_name="Existing",
            last_name="User",
        )

        payload = {
            "email": "existing@example.com",
            "password": "AnotherPassword123!",
            "first_name": "Another",
            "last_name": "User",
        }

        response = self.client.post(
            self.signup_url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_password_is_rejected(self):
        """Passwords that fail Django's password policy are rejected."""

        payload = {
            "email": "weak@example.com",
            "password": "123",
            "first_name": "Weak",
            "last_name": "Password",
        }

        response = self.client.post(
            self.signup_url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_email_is_required(self):
        """Signup must reject requests without an email address."""

        payload = {
            "password": "StrongPassword123!",
            "first_name": "Missing",
            "last_name": "Email",
        }

        response = self.client.post(
            self.signup_url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_names_are_required(self):
        """Signup must require both first and last names."""

        payload = {
            "email": "noname@example.com",
            "password": "StrongPassword123!",
        }

        response = self.client.post(
            self.signup_url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginAPITests(APITestCase):
    """Test the Kova login API."""

    login_url = "/api/auth/login/"

    def setUp(self):
        """Create a known user for authentication tests."""

        self.user = User.objects.create_user(
            email="login@example.com",
            password="StrongPassword123!",
            first_name="Login",
            last_name="User",
        )

    def test_user_can_log_in(self):
        """A user with valid credentials should receive JWT tokens."""

        payload = {
            "email": "login@example.com",
            "password": "StrongPassword123!",
        }

        response = self.client.post(
            self.login_url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("user", response.data)
        self.assertIn("kova_refresh_token", response.cookies)

        refresh_cookie = response.cookies["kova_refresh_token"]
        self.assertTrue(
            refresh_cookie["httponly"],
            "The refresh token cookie must be HttpOnly for security.",
        )

    def test_login_returns_user_information(self):
        """Successful login should return basic account information."""

        payload = {
            "email": "login@example.com",
            "password": "StrongPassword123!",
        }

        response = self.client.post(
            self.login_url,
            payload,
            format="json",
        )

        self.assertEqual(response.data["user"]["id"], self.user.id)
        self.assertEqual(response.data["user"]["email"], self.user.email)
        self.assertEqual(
            response.data["user"]["first_name"], self.user.first_name
        )
        self.assertEqual(
            response.data["user"]["last_name"], self.user.last_name
        )

    def test_wrong_password_is_rejected(self):
        """A valid email with an incorrect password must be rejected."""

        payload = {
            "email": "login@example.com",
            "password": "WrongPassword123!",
        }

        response = self.client.post(
            self.login_url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_email_is_rejected(self):
        """An email that does not belong to a user must be rejected."""

        payload = {
            "email": "doesnotexist@example.com",
            "password": "StrongPassword123!",
        }

        response = self.client.post(
            self.login_url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_never_returns_password(self):
        """The login response must never expose the user's password."""

        payload = {
            "email": "login@example.com",
            "password": "StrongPassword123!",
        }

        response = self.client.post(
            self.login_url,
            payload,
            format="json",
        )

        self.assertNotIn("password", response.data)
        self.assertNotIn("password", response.data.get("user", {}))

    def test_authenticated_user_can_logout(self):
        """Authenticated users can end their Kova session successfully."""

        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/auth/logout/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_logout_deletes_refresh_cookie(self):
        """Logout removes the refresh-token cookie from the response."""

        self.client.force_authenticate(user=self.user)
        response = self.client.post("/api/auth/logout/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(response.cookies["kova_refresh_token"]["max-age"], 0)

    def test_unauthenticated_user_cannot_logout(self):
        """Logout requires authentication."""

        response = self.client.post("/api/auth/logout/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)