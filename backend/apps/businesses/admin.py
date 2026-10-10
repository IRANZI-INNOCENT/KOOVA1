from django.contrib import admin
from django.db.models import Count

from apps.business_brain.models import (
    BusinessAudience,
    BusinessBrand,
    BusinessGoal,
    BusinessMarketBrief,
    BusinessPolicy,
    BusinessProfile,
)
from apps.commerce.models import CommercePage

from .models import Business


class _BrainInline(admin.StackedInline):
    extra = 0
    max_num = 1
    can_delete = False
    classes = ["collapse"]
    readonly_fields = ("created_at", "updated_at")


class ProfileInline(_BrainInline):
    model = BusinessProfile


class AudienceInline(_BrainInline):
    model = BusinessAudience


class BrandInline(_BrainInline):
    model = BusinessBrand


class GoalInline(_BrainInline):
    model = BusinessGoal


class PolicyInline(_BrainInline):
    model = BusinessPolicy


class MarketBriefInline(_BrainInline):
    model = BusinessMarketBrief
    readonly_fields = (
        "created_at",
        "updated_at",
        "researched_at",
        "starter_prompts_at",
    )


class StoreInline(admin.StackedInline):
    model = CommercePage
    extra = 0
    max_num = 1
    can_delete = False
    classes = ["collapse"]
    readonly_fields = ("created_at", "updated_at")


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "owner",
        "industry",
        "location",
        "phone",
        "store_live",
        "product_count",
        "order_count",
        "created_at",
    )
    list_filter = ("industry", "created_at")
    search_fields = (
        "name",
        "email",
        "phone",
        "location",
        "owner__email",
    )
    autocomplete_fields = ("owner",)
    readonly_fields = ("created_at", "updated_at")
    save_on_top = True
    change_form_template = "admin/businesses/business/change_form.html"
    inlines = [
        StoreInline,
        ProfileInline,
        AudienceInline,
        BrandInline,
        GoalInline,
        PolicyInline,
        MarketBriefInline,
    ]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("owner", "commerce_page")
            .annotate(
                _products=Count("products", distinct=True),
                _orders=Count("orders", distinct=True),
            )
        )

    @admin.display(description="Store", boolean=True)
    def store_live(self, obj):
        try:
            page = obj.commerce_page
        except CommercePage.DoesNotExist:
            return False
        return page.is_published

    @admin.display(description="Products", ordering="_products")
    def product_count(self, obj):
        return obj._products

    @admin.display(description="Orders", ordering="_orders")
    def order_count(self, obj):
        return obj._orders

    def change_view(self, request, object_id, form_url="", extra_context=None):
        extra_context = dict(extra_context or {})
        business = self.get_object(request, object_id)
        if business is not None:
            from .dossier import build_dossier

            extra_context["dossier"] = build_dossier(business)
        return super().change_view(request, object_id, form_url, extra_context)
