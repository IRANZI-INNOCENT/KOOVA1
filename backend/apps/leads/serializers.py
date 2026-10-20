from rest_framework import serializers

from .models import Lead


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = [
            "id",
            "business",
            "product",
            "customer_name",
            "customer_id",
            "conversation_id",
            "source",
            "interest",
            "notes",
            "status",
            "created_by_ai",
            "next_follow_up_at",
            "follow_up_draft",
            "last_followed_up_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "created_by_ai",
            "follow_up_draft",
            "last_followed_up_at",
            "created_at",
            "updated_at",
        ]
