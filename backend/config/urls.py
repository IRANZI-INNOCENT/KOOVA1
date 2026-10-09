from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
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

    # Business Brain — profile, audience, brand, goals, policies.
    path(
        "api/business-brain/",
        include("apps.business_brain.urls"),
    ),

    # Commerce — products, images, storefront, Snap to Sell.
    path(
        "api/commerce/",
        include("apps.commerce.urls"),
    ),

    # Content — AI-generated content assets.
    path(
        "api/content/",
        include("apps.content.urls"),
    ),

    # Leads — business leads and sales pipeline.
    path(
        "api/leads/",
        include("apps.leads.urls"),
    ),

    # Social — connected accounts, publishing, actions.
    path(
        "api/social/",
        include("apps.social.urls"),
    ),

    # Morning Brief — daily business overview.
    path(
        "api/brief/",
        include("apps.brief.urls"),
    ),

    # Kova AI Agent.
    path(
        "api/kova/",
        include("apps.kova_ai.api.urls"),
    ),
]

# Serve uploaded media files during development.
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )
