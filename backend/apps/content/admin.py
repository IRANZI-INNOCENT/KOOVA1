from django.contrib import admin

from .models import Content, ContentBatch


class ContentInline(admin.TabularInline):
    model = Content
    extra = 0
    fields = ("platform", "content_type", "status", "caption", "created_at")
    readonly_fields = ("created_at",)
    show_change_link = True


@admin.register(ContentBatch)
class ContentBatchAdmin(admin.ModelAdmin):
    list_display = ("business", "product", "brief_preview", "created_at")
    search_fields = ("brief", "business__name", "product__name")
    autocomplete_fields = ("business", "product")
    readonly_fields = ("id", "created_at")
    date_hierarchy = "created_at"
    inlines = [ContentInline]

    @admin.display(description="Brief")
    def brief_preview(self, obj):
        text = " ".join((obj.brief or "").split())
        return text[:80]


@admin.register(Content)
class ContentAdmin(admin.ModelAdmin):
    list_display = (
        "business",
        "product",
        "platform",
        "content_type",
        "status",
        "caption_preview",
        "created_by_ai",
        "created_at",
    )
    list_filter = ("platform", "content_type", "status", "created_by_ai")
    list_editable = ("status",)
    search_fields = ("caption", "business__name", "product__name")
    autocomplete_fields = ("business", "product", "batch", "social_account")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"
    save_on_top = True

    @admin.display(description="Caption")
    def caption_preview(self, obj):
        text = " ".join((obj.caption or "").split())
        return text[:100]
