from rest_framework import serializers

from .models import EmailPreference


class EmailPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailPreference
        fields = [
            "account",
            "alerts",
            "commerce",
            "reports",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]
