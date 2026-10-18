from django.contrib import admin

from .models import (
    CommercePage,
    CommercePageBanner,
    Order,
    Product,
    ProductAIAnalysis,
    ProductImage,
)


class CommercePageBannerInline(admin.TabularInline):
    model = CommercePageBanner
    extra = 0
    fields = ("image", "alt_text", "display_order", "created_at")
    readonly_fields = ("created_at",)
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
    list_display = (
        "business",
        "slug",
        "is_published",
        "layout_preset",
        "whatsapp",
        "phone",
        "updated_at",
    )
    list_filter = ("is_published", "layout_preset", "font_preset")
    list_editable = ("is_published",)
    search_fields = ("business__name", "slug", "title", "whatsapp", "phone")
    autocomplete_fields = ("business",)
    readonly_fields = ("created_at", "updated_at")
    actions = ("publish_stores", "unpublish_stores")
    inlines = (CommercePageBannerInline,)
    fieldsets = (
        (
            "Identity",
            {
                "fields": (
                    "business",
                    "slug",
                    "title",
                    "tagline",
                    "description",
                    "is_published",
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
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"
    actions = ("mark_confirmed", "mark_fulfilled", "mark_cancelled")

    @admin.action(description="Mark selected orders confirmed")
    def mark_confirmed(self, request, queryset):
        updated = queryset.update(status=Order.Status.CONFIRMED)
        self.message_user(request, f"Confirmed {updated} order(s).")

    @admin.action(description="Mark selected orders fulfilled")
    def mark_fulfilled(self, request, queryset):
        updated = queryset.update(status=Order.Status.FULFILLED)
        self.message_user(request, f"Fulfilled {updated} order(s).")

    @admin.action(description="Cancel selected orders")
    def mark_cancelled(self, request, queryset):
        updated = queryset.update(status=Order.Status.CANCELLED)
        self.message_user(request, f"Cancelled {updated} order(s).")
