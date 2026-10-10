from django.contrib import admin

from .models import SocialAccount, SocialAction, SocialMessage, SocialPost


@admin.register(SocialAccount)
class SocialAccountAdmin(admin.ModelAdmin):
    list_display = (
        "account_name",
        "business",
        "platform",
        "connection_status",
        "token_on_file",
        "last_verified_at",
        "connected_at",
    )
    list_filter = ("platform", "connection_status")
    search_fields = (
        "account_name",
        "account_username",
        "platform_account_id",
        "business__name",
    )
    autocomplete_fields = ("business",)
    readonly_fields = ("connected_at", "created_at", "updated_at", "token_on_file")
    exclude = ("access_token",)

    @admin.display(description="Token", boolean=True)
    def token_on_file(self, obj):
        return bool(obj.access_token)


@admin.register(SocialPost)
class SocialPostAdmin(admin.ModelAdmin):
    list_display = (
        "social_account",
        "publishing_status",
        "caption_preview",
        "error_preview",
        "scheduled_at",
        "published_at",
        "likes",
        "comments_count",
        "publishing_attempts",
        "created_at",
    )
    list_filter = ("publishing_status", "created_at")
    search_fields = (
        "external_post_id",
        "publishing_error",
        "content__caption",
        "social_account__account_name",
        "social_account__business__name",
    )
    autocomplete_fields = ("content", "social_account")
    readonly_fields = (
        "idempotency_key",
        "created_at",
        "updated_at",
        "published_at",
        "last_attempt_at",
    )
    date_hierarchy = "created_at"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("content", "social_account")

    @admin.display(description="Caption")
    def caption_preview(self, obj):
        text = " ".join((obj.content.caption or "").split())
        return text[:80]

    @admin.display(description="Error")
    def error_preview(self, obj):
        text = " ".join((obj.publishing_error or "").split())
        return text[:80]


@admin.register(SocialAction)
class SocialActionAdmin(admin.ModelAdmin):
    list_display = (
        "business",
        "action_type",
        "action_status",
        "requires_approval",
        "target_type",
        "created_at",
    )
    list_filter = ("action_type", "action_status", "requires_approval")
    search_fields = ("intent", "result", "business__name", "target_id")
    autocomplete_fields = ("business", "social_account", "approved_by")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"


@admin.register(SocialMessage)
class SocialMessageAdmin(admin.ModelAdmin):
    list_display = (
        "business",
        "channel",
        "kind",
        "direction",
        "intent",
        "delivery_status",
        "customer_name",
        "preview",
        "has_draft",
        "created_at",
    )
    list_filter = ("channel", "kind", "direction", "intent", "delivery_status")
    search_fields = ("body", "customer_name", "external_id", "business__name")
    autocomplete_fields = ("business", "social_account", "in_reply_to", "lead")
    readonly_fields = ("created_at",)
    date_hierarchy = "created_at"

    @admin.display(description="Text")
    def preview(self, obj):
        text = " ".join((obj.body or "").split())
        return text[:80]

    @admin.display(description="Draft", boolean=True)
    def has_draft(self, obj):
        return bool(obj.draft_reply)
