from rest_framework import serializers

from .models import Business


class BusinessSerializer(serializers.ModelSerializer):
    """
    Serialize a business owned by the authenticated user.

    Ownership is controlled by the server and can never be supplied
    by the frontend.
    """

    class Meta:
        model = Business
        fields = [
            "id",
            "owner",
            "name",
            "description",
            "industry",
            "location",
            "email",
            "phone",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        """Require a meaningful business name."""

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Business name is required."
            )

        return value