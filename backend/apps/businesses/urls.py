from django.urls import path

from .views import (
    BusinessDetailView,
    BusinessListCreateView,
)


urlpatterns = [
    path(
        "",
        BusinessListCreateView.as_view(),
        name="business-list-create",
    ),
    path(
        "<int:business_id>/",
        BusinessDetailView.as_view(),
        name="business-detail",
    ),
]