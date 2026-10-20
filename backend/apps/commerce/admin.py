from django.contrib import admin
from django.utils.html import format_html

from .models import (
    BusinessExpense,
    CommercePage,
    CommercePageBanner,
    Order,
    Product,
    ProductAIAnalysis,
    ProductImage,
)
from .storefront_urls import commerce_page_url


@admin.register(BusinessExpense)
class BusinessExpenseAdmin(admin.ModelAdmin):
    list_display = ("business", "spent_on", "category", "amount", "currency", "note")
    list_filter = ("category", "spent_on")
    search_fields = ("note", "business__name")
    autocomplete_fields = ("business",)


class CommercePageBannerInline(admin.TabularInline):
    model = CommercePageBanner
    extra = 0
    fields = ("image", "alt_text", "product", "display_order", "created_at")
    readonly_fields = ("created_at",)
    autocomplete_fields = ("product",)
    ordering = ("display_order", "created_at")


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0
    fields = ("image", "alt_text", "is_primary", "display_order", "created_at")
    readonly_fields = ("created_at",)


class AnalysisInline(admin.StackedInline):
    model = ProductAIAnalysis
    extra = 0
    classes = ["collapse"]
    readonly_fields = ("model", "result", "confidence", "created_at")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(CommercePage)
class CommercePageAdmin(admin.ModelAdmin):
    """
    Storefront directory — every business commerce URL in one place.
    """

    list_display = (
        "business",
        "store_url_link",
        "slug",
        "is_published",
        "whatsapp",
        "phone",
        "updated_at",
    )
    list_display_links = ("business", "slug")
    list_filter = ("is_published", "layout_preset", "font_preset")
    list_editable = ("is_published",)
    search_fields = ("business__name", "slug", "title", "whatsapp", "phone")
    autocomplete_fields = ("business",)
    readonly_fields = ("store_url_link", "created_at", "updated_at")
    ordering = ("business__name",)
    actions = ("publish_stores", "unpublish_stores")
    inlines = (CommercePageBannerInline,)
    fieldsets = (
        (
            "Storefront URL",
            {
                "description": "Public link customers use to browse this business.",
                "fields": ("store_url_link", "slug", "is_published"),
            },
        ),
        (
            "Identity",
            {
                "fields": (
                    "business",
                    "title",
                    "tagline",
                    "description",
                )
            },
        ),
        (
            "Contact",
            {"fields": ("whatsapp", "phone", "email", "location")},
        ),
        (
            "Brand look",
            {
                "fields": (
                    "primary_color",
                    "secondary_color",
                    "accent_color",
                    "logo",
                    "cover",
                    "layout_preset",
                    "font_preset",
                    "show_hero",
                    "show_about",
                    "show_featured",
                )
            },
        ),
        ("Dates", {"fields": ("created_at", "updated_at")}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("business")

    @admin.display(description="Store URL")
    def store_url_link(self, obj):
        url = commerce_page_url(obj)
        if not url:
            return "—"
        label = url
        if not obj.is_published:
            return format_html(
                '<a href="{}" target="_blank" rel="noopener noreferrer">{}</a>'
                ' <span style="color:#888">(draft)</span>',
                url,
                label,
            )
        return format_html(
            '<a href="{}" target="_blank" rel="noopener noreferrer">{}</a>',
            url,
            label,
        )

    @admin.action(description="Publish selected stores")
    def publish_stores(self, request, queryset):
        updated = queryset.update(is_published=True)
        self.message_user(request, f"Published {updated} store(s).")

    @admin.action(description="Unpublish selected stores")
    def unpublish_stores(self, request, queryset):
        updated = queryset.update(is_published=False)
        self.message_user(request, f"Unpublished {updated} store(s).")


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "business",
        "status",
        "price",
        "currency",
        "stock",
        "category",
        "updated_at",
    )
    list_filter = ("status", "currency", "ai_generated", "business")
    list_editable = ("status",)
    search_fields = ("name", "sku", "category", "business__name")
    autocomplete_fields = ("business",)
    readonly_fields = ("created_at", "updated_at", "slug")
    save_on_top = True
    inlines = [ProductImageInline, AnalysisInline]
    actions = ("mark_active", "archive_products")
    fieldsets = (
        (
            "Identity",
            {
                "fields": (
                    "business",
                    "name",
                    "slug",
                    "sku",
                    "category",
                    "status",
                )
            },
        ),
        (
            "Commercial facts",
            {
                "fields": (
                    "price",
                    "currency",
                    "stock",
                    "brand",
                    "material",
                    "size",
                    "color",
                    "condition",
                )
            },
        ),
        (
            "Public listing",
            {
                "fields": (
                    "short_description",
                    "description",
                    "seo_title",
                    "seo_description",
                    "selling_points",
                    "keywords",
                )
            },
        ),
        (
            "Kova reading",
            {
                "classes": ("collapse",),
                "fields": (
                    "visual_attributes",
                    "uncertain_attributes",
                    "ai_summary",
                    "ai_confidence",
                    "ai_generated",
                ),
            },
        ),
        ("Dates", {"fields": ("created_at", "updated_at")}),
    )

    @admin.action(description="Mark selected products active")
    def mark_active(self, request, queryset):
        updated = queryset.update(status=Product.Status.ACTIVE)
        self.message_user(request, f"Marked {updated} product(s) active.")

    @admin.action(description="Archive selected products")
    def archive_products(self, request, queryset):
        updated = queryset.update(status=Product.Status.ARCHIVED)
        self.message_user(request, f"Archived {updated} product(s).")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "business",
        "product",
        "customer_name",
        "phone",
        "quantity",
        "status",
        "source",
        "created_at",
    )
    list_filter = ("status", "source", "created_at")
    list_editable = ("status",)
    search_fields = (
        "customer_name",
        "phone",
        "business__name",
        "product__name",
    )
    autocomplete_fields = ("business", "product")
    readonly_fields = (
        "review_ask_draft",
        "stock_adjusted",
        "created_at",
        "updated_at",
    )
    date_hierarchy = "created_at"
    actions = (
        "mark_confirmed",
        "mark_packing",
        "mark_delivered",
        "mark_cancelled",
    )
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "business",
                    "product",
                    "customer_name",
                    "phone",
                    "quantity",
                    "status",
                    "source",
                    "note",
                )
            },
        ),
        (
            "Delivery",
            {
                "fields": (
                    "customer_address",
                    "delivery_note",
                    "rider_name",
                    "review_ask_draft",
                    "stock_adjusted",
                )
            },
        ),
        ("Dates", {"fields": ("created_at", "updated_at")}),
    )

    @admin.action(description="Mark selected orders confirmed")
    def mark_confirmed(self, request, queryset):
        updated = queryset.update(status=Order.Status.CONFIRMED)
        self.message_user(request, f"Confirmed {updated} order(s).")

    @admin.action(description="Mark selected orders packing")
    def mark_packing(self, request, queryset):
        updated = queryset.update(status=Order.Status.PACKING)
        self.message_user(request, f"Marked {updated} order(s) packing.")

    @admin.action(description="Mark selected orders delivered")
    def mark_delivered(self, request, queryset):
        updated = queryset.update(status=Order.Status.DELIVERED)
        self.message_user(request, f"Delivered {updated} order(s).")

    @admin.action(description="Cancel selected orders")
    def mark_cancelled(self, request, queryset):
        updated = queryset.update(status=Order.Status.CANCELLED)
        self.message_user(request, f"Cancelled {updated} order(s).")
