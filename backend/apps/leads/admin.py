from django.contrib import admin

from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = [
        "business",
        "customer_name",
        "source",
        "status",
        "created_by_ai",
        "created_at",
    ]
    list_filter = ["source", "status", "created_by_ai"]
    search_fields = ["customer_name", "interest", "business__name"]
    readonly_fields = ["created_at", "updated_at"]
