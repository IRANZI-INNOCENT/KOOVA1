from rest_framework import serializers

from .models import Lead


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = [
            "id",
            "business",
            "customer_name",
            "customer_id",
            "conversation_id",
            "source",
            "interest",
            "notes",
            "status",
            "created_by_ai",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "created_by_ai",
            "created_at",
            "updated_at",
        ]
