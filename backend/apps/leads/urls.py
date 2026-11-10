from django.urls import path

from .views import LeadCreateOrderView, LeadDetailView, LeadListView

app_name = "leads"

urlpatterns = [
    path(
        "<int:business_id>/",
        LeadListView.as_view(),
        name="lead-list",
    ),
    path(
        "<int:business_id>/<int:pk>/",
        LeadDetailView.as_view(),
        name="lead-detail",
    ),
    path(
        "<int:business_id>/<int:pk>/order/",
        LeadCreateOrderView.as_view(),
        name="lead-create-order",
    ),
]
