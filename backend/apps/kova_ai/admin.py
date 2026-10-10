from django.contrib import admin

from .models import KovaExchange


@admin.register(KovaExchange)
class KovaExchangeAdmin(admin.ModelAdmin):
    list_display = (
        "business",
        "user",
        "task",
        "status",
        "request_preview",
        "tool_count",
        "model_name",
        "created_at",
    )
    list_filter = ("status", "task", "created_at")
    search_fields = (
        "request_text",
        "response_text",
        "error",
        "business__name",
        "user__email",
    )
    autocomplete_fields = ("business", "user")
    readonly_fields = (
        "business",
        "user",
        "task",
        "request_text",
        "response_text",
        "model_name",
        "status",
        "error",
        "tool_calls",
        "created_at",
    )
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False

    @admin.display(description="Request")
    def request_preview(self, obj):
        text = " ".join((obj.request_text or "").split())
        return text[:100]

    @admin.display(description="Tools")
    def tool_count(self, obj):
        return len(obj.tool_calls or [])
