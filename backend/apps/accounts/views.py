from django.conf import settings
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    LoginSerializer,
    SignupSerializer,
)
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)

from .serializers import (
    CurrentUserSerializer,
    LoginSerializer,
    SignupSerializer,
)


class SignupView(generics.CreateAPIView):
    """
    Create a new Kova user account.

    Signup is intentionally available to unauthenticated users because
    authentication does not exist yet at the point of registration.
    """

    serializer_class = SignupSerializer
    permission_classes = [AllowAny]


class LoginView(generics.GenericAPIView):
    """
    Authenticate a Kova user and create an application session.

    The short-lived access token is returned in the response body.

    The longer-lived refresh token is stored in an HttpOnly cookie so
    frontend JavaScript cannot directly access the refresh credential.
    """

    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """
        Authenticate the submitted credentials and issue tokens.
        """

        serializer = self.get_serializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)

        response = Response(
            {
                "access": str(refresh.access_token),
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
            },
            status=status.HTTP_200_OK,
        )

        # Keep the long-lived refresh credential out of JavaScript.
        #
        # HttpOnly prevents frontend JavaScript from reading the cookie.
        # This provides a stronger security boundary than storing the
        # refresh token in localStorage.
        #
        # Local HTTP leaves the cookie insecure.
        # Production settings mark it Secure for HTTPS.
        response.set_cookie(
            key="kova_refresh_token",
            value=str(refresh),
            httponly=True,
            secure=settings.REFRESH_COOKIE_SECURE,
            samesite=settings.REFRESH_COOKIE_SAMESITE,
            max_age=7 * 24 * 60 * 60,
        )

        return response


class RefreshTokenView(generics.GenericAPIView):
    """
    Issue a new access token using Kova's HttpOnly refresh cookie.

    The refresh token is intentionally read from the cookie rather
    than from the request body so that frontend JavaScript never
    needs direct access to the long-lived refresh credential.
    """

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """
        Validate the refresh cookie and return a new access token.
        """

        refresh_token = request.COOKIES.get(
            "kova_refresh_token",
        )

        if not refresh_token:
            return Response(
                {
                    "detail": "Authentication session not found.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            refresh = RefreshToken(refresh_token)

            return Response(
                {
                    "access": str(refresh.access_token),
                },
                status=status.HTTP_200_OK,
            )

        except TokenError:
            return Response(
                {
                    "detail": "Authentication session has expired.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )


class CurrentUserView(generics.RetrieveAPIView):
    """
    Return the currently authenticated Kova user.

    Authentication is handled by SimpleJWT. The access token identifies
    the user, and request.user is populated by Django REST Framework.
    """

    serializer_class = CurrentUserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        """
        Return the user associated with the authenticated request.

        We do not accept a user ID from the client because the endpoint
        should always represent the identity established by authentication.
        """
        return self.request.user

class LogoutView(generics.GenericAPIView):
    """
    Log out the currently authenticated Kova user.

    Logout removes the refresh-token cookie from the browser.
    The short-lived access token remains valid until it expires,
    but the browser can no longer restore a new session through
    the refresh endpoint.

    Refresh-token blacklisting can be added later as an additional
    authentication security layer.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """
        Remove the Kova refresh-token cookie and end the session.
        """

        response = Response(
            status=status.HTTP_204_NO_CONTENT,
        )

        # Remove the refresh credential from the browser.
        #
        # The cookie name and security attributes must match the
        # cookie created by LoginView.
        response.delete_cookie(
            key="kova_refresh_token",
            samesite=settings.REFRESH_COOKIE_SAMESITE,
        )

        return response