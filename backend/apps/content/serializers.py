from rest_framework import serializers

from .models import Content, ContentBatch


class ContentSerializer(serializers.ModelSerializer):
    product_name = serializers.SerializerMethodField()
    product_image = serializers.SerializerMethodField()
    batch_id = serializers.SerializerMethodField()
    account_name = serializers.SerializerMethodField()
    queue_status = serializers.SerializerMethodField()
    scheduled_at = serializers.SerializerMethodField()

    class Meta:
        model = Content
        fields = [
            "id",
            "business",
            "batch_id",
            "product",
            "product_name",
            "product_image",
            "social_account",
            "account_name",
            "platform",
            "content_type",
            "caption",
            "call_to_action",
            "hashtags",
            "media_urls",
            "slides",
            "status",
            "queue_status",
            "scheduled_at",
            "created_by_ai",
            "published_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "business",
            "batch_id",
            "product_name",
            "product_image",
            "account_name",
            "created_by_ai",
            "published_at",
            "created_at",
            "updated_at",
        ]

    def get_product_name(self, obj):
        if obj.product:
            return obj.product.name
        return None

    def get_product_image(self, obj):
        if not obj.product:
            return None
        primary = obj.product.images.filter(is_primary=True).first()
        if not primary:
            primary = obj.product.images.first()
        if primary and primary.image:
            return primary.image.url
        return None

    def get_batch_id(self, obj):
        if obj.batch_id:
            return str(obj.batch_id)
        return None

    def get_account_name(self, obj):
        if obj.social_account:
            return obj.social_account.account_name or obj.social_account.account_username
        return None

    def _latest_post(self, obj):
        posts = getattr(obj, "_prefetched_objects_cache", {}).get("social_posts")
        if posts is not None:
            return posts[0] if posts else None
        return obj.social_posts.order_by("-created_at").first()

    def get_queue_status(self, obj):
        post = self._latest_post(obj)
        return post.publishing_status if post else None

    def get_scheduled_at(self, obj):
        post = self._latest_post(obj)
        if post and post.scheduled_at:
            return post.scheduled_at.isoformat()
        return None


class ContentBatchSerializer(serializers.ModelSerializer):
    contents = ContentSerializer(many=True, read_only=True)
    product_name = serializers.SerializerMethodField()

    class Meta:
        model = ContentBatch
        fields = [
            "id",
            "business",
            "product",
            "product_name",
            "brief",
            "contents",
            "created_at",
        ]
        read_only_fields = fields

    def get_product_name(self, obj):
        if obj.product:
            return obj.product.name
        return None
