from django.contrib import admin

from .models import EmailLog, EmailPreference


@admin.register(EmailPreference)
class EmailPreferenceAdmin(admin.ModelAdmin):
    list_display = ("user", "account", "alerts", "commerce", "reports", "updated_at")
    search_fields = ("user__email", "token")
    readonly_fields = ("token", "created_at", "updated_at")


@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "kind", "user", "business", "status", "subject")
    list_filter = ("status", "kind", "category")
    search_fields = ("subject", "user__email", "resend_id", "error_message")
    readonly_fields = ("created_at",)
