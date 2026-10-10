from django.contrib import admin
from django.utils.html import format_html, format_html_join
from django.utils.safestring import mark_safe

from apps.businesses.dossier import brief_blocks

from .models import MorningBrief


@admin.register(MorningBrief)
class MorningBriefAdmin(admin.ModelAdmin):
    list_display = ("business", "date", "status", "greeting", "created_at")
    list_filter = ("status", "date")
    search_fields = ("greeting", "business__name", "error_message")
    autocomplete_fields = ("business",)
    readonly_fields = ("created_at", "updated_at", "readable")
    date_hierarchy = "date"
    fieldsets = (
        (None, {"fields": ("business", "date", "status", "greeting", "readable", "error_message")}),
        ("Stored sections", {"classes": ("collapse",), "fields": ("sections", "evidence")}),
        ("Dates", {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(description="Brief")
    def readable(self, obj):
        blocks = brief_blocks(obj.sections)
        if not blocks:
            return "This brief has no readable sections yet."
        parts = []
        for block in blocks:
            lines = format_html_join("", "<li>{}</li>", ((line,) for line in block["lines"]))
            parts.append(format_html("<h3>{}</h3><ul>{}</ul>", block["title"], lines))
        return mark_safe("".join(parts))
