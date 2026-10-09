from django.contrib import admin

from .models import Content


@admin.register(Content)
class ContentAdmin(admin.ModelAdmin):
    list_display = [
        "business",
        "platform",
        "content_type",
        "status",
        "created_by_ai",
        "created_at",
    ]
    list_filter = ["platform", "content_type", "status", "created_by_ai"]
    search_fields = ["caption", "business__name"]
    readonly_fields = ["created_at", "updated_at"]
