from django.contrib import admin
from django.urls import include, path
from django.urls import include, path


urlpatterns = [
    path("admin/", admin.site.urls),

    # Authentication and account-management endpoints.
    path(
        "api/auth/",
        include("apps.accounts.urls"),
    ),

    # Business management endpoints.
    path(
        "api/businesses/",
        include("apps.businesses.urls"),
    ),
     path(
        "api/business-brain/",
        include("apps.business_brain.urls"),
    ),

    path(
    "api/kova/",
    include(
        "apps.kova_ai.api.urls",
    ),
),
]