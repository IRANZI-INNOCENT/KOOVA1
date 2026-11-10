from rest_framework import serializers

from .models import SocialAccount, SocialAction, SocialMessage, SocialPost


class SocialAccountSerializer(serializers.ModelSerializer):
    is_healthy = serializers.BooleanField(read_only=True)
    capabilities = serializers.SerializerMethodField()

    def get_capabilities(self, obj):
        from .services.capabilities import account_capabilities

        return account_capabilities(obj)

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
            "capabilities",
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
            "capabilities",
            "created_at",
            "updated_at",
        ]


class SocialPostSerializer(serializers.ModelSerializer):
    caption = serializers.CharField(source="content.caption", read_only=True)
    platform = serializers.CharField(source="content.platform", read_only=True)
    content_type = serializers.CharField(source="content.content_type", read_only=True)
    product_name = serializers.SerializerMethodField()
    account_name = serializers.CharField(source="social_account.account_name", read_only=True)
    media_urls = serializers.SerializerMethodField()
    preview_image = serializers.SerializerMethodField()

    def get_product_name(self, obj):
        product = getattr(obj.content, "product", None)
        return product.name if product else None

    def get_media_urls(self, obj):
        from apps.content.services.content_quality import publish_image_urls_from_content

        return publish_image_urls_from_content(obj.content)

    def get_preview_image(self, obj):
        urls = self.get_media_urls(obj)
        return urls[0] if urls else None

    class Meta:
        model = SocialPost
        fields = [
            "id",
            "content",
            "caption",
            "platform",
            "content_type",
            "product_name",
            "media_urls",
            "preview_image",
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
            "confidence",
            "needs_review",
            "lead",
            "reply_error",
            "delivery_status",
            "in_reply_to",
            "created_at",
        ]
        read_only_fields = fields
