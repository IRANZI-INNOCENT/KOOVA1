from rest_framework import serializers

from .models import Business


class BusinessSerializer(serializers.ModelSerializer):
    """
    Serialize a business owned by the authenticated user.

    Ownership is controlled by the server and can never be supplied
    by the frontend.
    """

    has_facebook_page = serializers.SerializerMethodField()

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
            "has_facebook_page",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "owner",
            "has_facebook_page",
            "created_at",
            "updated_at",
        ]

    def get_has_facebook_page(self, obj: Business) -> bool:
        from apps.social.models import SocialAccount

        return SocialAccount.objects.filter(
            business=obj,
            platform=SocialAccount.Platform.FACEBOOK_PAGE,
            connection_status=SocialAccount.ConnectionStatus.CONNECTED,
        ).exists()

    def validate_name(self, value):
        """Require a meaningful business name."""

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Business name is required."
            )

        return value