from django.contrib import admin

from .models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessMarketBrief,
    BusinessPolicy,
    BusinessProfile,
)


class _BrainAdmin(admin.ModelAdmin):
    list_display = ("business", "updated_at")
    search_fields = ("business__name", "business__owner__email")
    autocomplete_fields = ("business",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(BusinessProfile)
class BusinessProfileAdmin(_BrainAdmin):
    pass


@admin.register(BusinessAudience)
class BusinessAudienceAdmin(_BrainAdmin):
    pass


@admin.register(BusinessBrand)
class BusinessBrandAdmin(_BrainAdmin):
    pass


@admin.register(BusinessGoal)
class BusinessGoalAdmin(_BrainAdmin):
    pass


@admin.register(BusinessPolicy)
class BusinessPolicyAdmin(_BrainAdmin):
    list_display = (
        "business",
        "social_operating_mode",
        "allow_auto_publish",
        "facebook_max_posts_per_day",
        "instagram_max_posts_per_week",
        "allow_comment_replies",
        "allow_dm_replies",
        "updated_at",
    )
    list_filter = (
        "social_operating_mode",
        "allow_auto_publish",
        "allow_comment_replies",
        "allow_dm_replies",
    )
    fieldsets = (
        (None, {
            "fields": (
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
            ),
        }),
        ("Posting cadence", {
            "fields": (
                "facebook_max_posts_per_day",
                "facebook_max_posts_per_week",
                "instagram_max_posts_per_day",
                "instagram_max_posts_per_week",
                "min_hours_between_posts",
            ),
        }),
    )


@admin.register(BusinessMarketBrief)
class BusinessMarketBriefAdmin(_BrainAdmin):
    list_display = ("business", "status", "kept", "researched_at", "updated_at")
    list_filter = ("status", "kept")
    readonly_fields = (
        "created_at",
        "updated_at",
        "researched_at",
        "starter_prompts_at",
    )
