from django.contrib.auth import get_user_model
from rest_framework import serializers


User = get_user_model()


class SignupSerializer(serializers.ModelSerializer):
    """
    Validate and create new Kova user accounts.

    The password is accepted during signup but is never included
    in the API response because it is write-only.
    """

    password = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "password",
            "first_name",
            "last_name",
        ]
        read_only_fields = [
            "id",
        ]

    def validate_email(self, value):
        """
        Normalize and validate the email address.

        Kova requires every account to have a unique email address.
        """

        email = value.strip().lower()

        if User.objects.filter(
            email=email,
        ).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return email

    def validate(self, attrs):
        """
        Validate the complete signup payload.

        Django's password validators are applied here so that the
        API follows the same password security rules used elsewhere.
        """

        from django.contrib.auth.password_validation import (
            validate_password,
        )

        validate_password(
            attrs["password"],
        )

        return attrs

    def create(self, validated_data):
        """
        Create the user through the custom UserManager.

        Using create_user() ensures the password is properly hashed.
        """

        return User.objects.create_user(
            **validated_data,
        )

class LoginSerializer(serializers.Serializer):
    """
    Validate Kova login credentials.

    The serializer authenticates the user using their email address
    and password. Successful authentication is later converted into
    JWT tokens by the login view.
    """

    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
    )

    def validate(self, attrs):
        """
        Verify the supplied email and password.

        Django's authentication system performs the actual password
        verification. This keeps authentication logic centralized
        instead of manually comparing password values.
        """
        from django.contrib.auth import authenticate

        email = attrs["email"].strip().lower()
        password = attrs["password"]

        # authenticate() verifies the credentials using Django's
        # configured authentication system and password hashing.
        user = authenticate(
            username=email,
            password=password,
        )

        if user is None:
            raise serializers.ValidationError(
                "Invalid email or password."
            )

        # Store the authenticated user so the view can generate
        # tokens for the correct account.
        attrs["user"] = user

        return attrs

class CurrentUserSerializer(serializers.ModelSerializer):
    """
    Serialize the authenticated user's safe profile information.

    This serializer is used by the /me/ endpoint. Sensitive
    authentication information such as passwords and tokens is never
    included in the response.
    """

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
        ]
        read_only_fields = [
            "id",
            "email",
            "first_name",
            "last_name",
        ]