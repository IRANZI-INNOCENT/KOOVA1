from django.contrib import admin, messages

from .models import AiModelRoute, AiUsageEvent, KovaExchange
from .services.model_routes import (
    TASK_BY_KEY,
    clear_route_cache,
    ensure_default_routes,
)


@admin.register(AiModelRoute)
class AiModelRouteAdmin(admin.ModelAdmin):
    """
    Control which OpenRouter model each AI task uses.

    Defaults favour cheaper Flash Lite models; raise quality from the dropdown
    only where copy or vision quality is not good enough.
    """

    list_display = (
        "task_label",
        "model_id",
        "default_hint",
        "updated_at",
    )
    list_editable = ("model_id",)
    list_display_links = ("task_label",)
    ordering = ("task_key",)
    search_fields = ("task_key", "model_id")
    readonly_fields = ("task_key", "task_help", "updated_at")
    fields = ("task_key", "task_help", "model_id", "updated_at")

    def get_queryset(self, request):
        ensure_default_routes()
        return super().get_queryset(request)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        clear_route_cache()

    def changelist_view(self, request, extra_context=None):
        created = ensure_default_routes()
        if created:
            messages.info(
                request,
                f"Seeded {created} AI task route(s) with cost-saving defaults.",
            )
        # list_editable saves go through this path too — clear cache after POST.
        response = super().changelist_view(request, extra_context=extra_context)
        if request.method == "POST":
            clear_route_cache()
        return response

    @admin.display(description="Task", ordering="task_key")
    def task_label(self, obj):
        spec = TASK_BY_KEY.get(obj.task_key)
        return spec.label if spec else obj.task_key

    @admin.display(description="Catalog default")
    def default_hint(self, obj):
        spec = TASK_BY_KEY.get(obj.task_key)
        return spec.default_model if spec else "—"

    @admin.display(description="What this task does")
    def task_help(self, obj):
        spec = TASK_BY_KEY.get(obj.task_key)
        return spec.help_text if spec else ""


@admin.register(AiUsageEvent)
class AiUsageEventAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "feature",
        "business",
        "model_name",
        "prompt_tokens",
        "completion_tokens",
        "total_tokens",
    )
    list_filter = ("feature", "created_at")
    search_fields = ("feature", "model_name", "business__name")
    autocomplete_fields = ("business",)
    readonly_fields = (
        "business",
        "feature",
        "model_name",
        "prompt_tokens",
        "completion_tokens",
        "total_tokens",
        "created_at",
    )
    date_hierarchy = "created_at"

    def has_add_permission(self, request):
        return False


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
