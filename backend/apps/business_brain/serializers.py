from rest_framework import serializers

from .models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessProfile,
)

from rest_framework import serializers

from .models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessMarketBrief,
    BusinessPolicy,
    BusinessProfile,
)

from .models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessPolicy,
    BusinessProfile,
)

from .models import BusinessProfile
from .models import BusinessAudience, BusinessProfile

class BusinessProfileSerializer(serializers.ModelSerializer):
    """
    Serialize BusinessProfile information for the Kova API.

    The business relationship is read-only because the profile must
    always belong to the business identified by the API URL. Clients
    must never be allowed to move a profile between businesses.
    """

    business = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    class Meta:
        model = BusinessProfile
        fields = [
            "id",
            "business",
            "mission",
            "value_proposition",
            "target_market",
            "business_model",
            "business_stage",
            "website",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "created_at",
            "updated_at",
        ]

class BusinessAudienceSerializer(serializers.ModelSerializer):
    """
    Serialize BusinessAudience information for the Kova API.

    The business relationship is read-only because the audience
    must always belong to the business identified by the API URL.
    Clients must never be allowed to move an audience profile
    between businesses.
    """

    business = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    class Meta:
        model = BusinessAudience
        fields = [
            "id",
            "business",
            "primary_audience",
            "customer_needs",
            "pain_points",
            "buying_motivations",
            "customer_behavior",
            "preferred_channels",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "created_at",
            "updated_at",
        ]


class BusinessBrandSerializer(serializers.ModelSerializer):
    """
    Serialize the communication identity of a business.

    The business relationship is read-only so the client cannot
    move a brand profile from one business to another.
    """

    business = serializers.PrimaryKeyRelatedField(
        read_only=True,
    )

    class Meta:
        model = BusinessBrand
        fields = [
            "id",
            "business",
            "voice",
            "tone",
            "positioning",
            "brand_personality",
            "content_style",
            "communication_preferences",
            "kenya_relatable_mode",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "created_at",
            "updated_at",
        ]


class BusinessGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessGoal
        fields = [
            "id",
            "business",
            "primary_goal",
            "secondary_goals",
            "growth_priorities",
            "success_metrics",
            "current_challenges",
            "time_horizon",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "created_at",
            "updated_at",
        ]


class BusinessMarketBriefSerializer(serializers.ModelSerializer):
    """The owner can edit the prose. Search results and the keep flag stay on their own endpoints."""

    business = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = BusinessMarketBrief
        fields = [
            "id",
            "business",
            "status",
            "kept",
            "summary",
            "competitors",
            "gap",
            "positioning",
            "sources",
            "researched_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "status",
            "kept",
            "competitors",
            "sources",
            "researched_at",
            "created_at",
            "updated_at",
        ]


class BusinessPolicySerializer(serializers.ModelSerializer):
    def update(self, instance, validated_data):
        if validated_data.get("social_operating_mode") == "autopilot":
            validated_data["automation_paused"] = False
            validated_data["automation_pause_reason"] = ""
        return super().update(instance, validated_data)

    class Meta:
        model = BusinessPolicy
        fields = [
            "id",
            "business",
            "social_operating_mode",
            "allow_content_creation",
            "allow_auto_publish",
            "allow_comment_replies",
            "allow_dm_replies",
            "allow_lead_creation",
            "allow_product_management",
            "allow_order_management",
            "require_discount_approval",
            "max_auto_discount_percent",
            "require_refund_approval",
            "require_payment_approval",
            "automation_paused",
            "automation_pause_reason",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "created_at",
            "updated_at",
        ]