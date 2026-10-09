from rest_framework import serializers

from .models import SocialAccount, SocialAction, SocialMessage, SocialPost


class SocialAccountSerializer(serializers.ModelSerializer):
    is_healthy = serializers.BooleanField(read_only=True)

    class Meta:
        model = SocialAccount
        fields = [
            "id",
            "business",
            "platform",
            "platform_account_id",
            "account_name",
            "account_username",
            "profile_picture_url",
            "scopes",
            "connection_status",
            "connection_error",
            "connected_at",
            "last_verified_at",
            "metadata",
            "is_healthy",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "platform_account_id",
            "scopes",
            "connection_status",
            "connection_error",
            "connected_at",
            "last_verified_at",
            "metadata",
            "is_healthy",
            "created_at",
            "updated_at",
        ]


class SocialPostSerializer(serializers.ModelSerializer):
    caption = serializers.CharField(source="content.caption", read_only=True)
    platform = serializers.CharField(source="content.platform", read_only=True)
    account_name = serializers.CharField(source="social_account.account_name", read_only=True)

    class Meta:
        model = SocialPost
        fields = [
            "id",
            "content",
            "caption",
            "platform",
            "account_name",
            "social_account",
            "external_post_id",
            "publishing_status",
            "scheduled_at",
            "published_at",
            "publishing_error",
            "publishing_attempts",
            "last_attempt_at",
            "reach",
            "impressions",
            "likes",
            "comments_count",
            "shares",
            "clicks",
            "metrics_updated_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "external_post_id",
            "publishing_status",
            "published_at",
            "publishing_error",
            "publishing_attempts",
            "last_attempt_at",
            "reach",
            "impressions",
            "likes",
            "comments_count",
            "shares",
            "clicks",
            "metrics_updated_at",
            "created_at",
            "updated_at",
        ]


class SocialActionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialAction
        fields = [
            "id",
            "business",
            "social_account",
            "action_type",
            "action_status",
            "intent",
            "result",
            "requires_approval",
            "approved_at",
            "executed_at",
            "target_type",
            "target_id",
            "created_at",
        ]
        read_only_fields = fields


class SocialMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocialMessage
        fields = [
            "id",
            "business",
            "social_account",
            "channel",
            "kind",
            "direction",
            "customer_name",
            "body",
            "draft_reply",
            "external_id",
            "reply_target_id",
            "intent",
            "lead",
            "reply_error",
            "delivery_status",
            "in_reply_to",
            "created_at",
        ]
        read_only_fields = fields
