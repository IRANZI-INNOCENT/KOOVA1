from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from django.views.static import serve


def health(request):
    from django.db import connection

    try:
        connection.ensure_connection()
    except Exception:
        return JsonResponse(
            {"status": "degraded", "database": "unavailable"},
            status=503,
        )
    return JsonResponse({"status": "ok"})


admin.site.site_header = "Kova"
admin.site.site_title = "Kova admin"
admin.site.index_title = "Operations"
admin.site.index_template = "admin/kova_index.html"

_original_admin_index = admin.site.index


def _kova_admin_index(request, extra_context=None):
    from .admin_dashboard import kova_stats

    extra_context = dict(extra_context or {})
    extra_context["kova_stats"] = kova_stats()
    return _original_admin_index(request, extra_context)


admin.site.index = _kova_admin_index


urlpatterns = [
    path("api/health/", health),

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

# Serve uploaded product photos. Debug uses the development helper.
# Production keeps the same path so public store images stay reachable.
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )
else:
    urlpatterns += [
        re_path(
            r"^media/(?P<path>.*)$",
            serve,
            {"document_root": settings.MEDIA_ROOT},
        ),
    ]
