from django.contrib import admin

from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = (
        "customer_name",
        "business",
        "source",
        "status",
        "interest_preview",
        "created_by_ai",
        "created_at",
    )
    list_filter = ("source", "status", "created_by_ai", "created_at")
    list_editable = ("status",)
    search_fields = (
        "customer_name",
        "customer_id",
        "interest",
        "business__name",
    )
    autocomplete_fields = ("business",)
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "created_at"

    @admin.display(description="Interest")
    def interest_preview(self, obj):
        text = " ".join((obj.interest or "").split())
        return text[:80]
