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
        "<int:pk>/",
        BusinessDetailView.as_view(),
        name="business-detail",
    ),
]