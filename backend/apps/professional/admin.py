from django.contrib import admin

from .models import (
    ContentPillar,
    LinkedInConnection,
    ProfessionalPost,
    ProfessionalProfile,
    ProfessionalProgram,
    ProfessionalWeeklyBrief,
)


@admin.register(ProfessionalProfile)
class ProfessionalProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "role_title", "operating_mode", "onboarding_path")
    search_fields = ("user__email", "headline", "role_title")


admin.site.register(ContentPillar)
admin.site.register(LinkedInConnection)
admin.site.register(ProfessionalProgram)
admin.site.register(ProfessionalPost)
admin.site.register(ProfessionalWeeklyBrief)
