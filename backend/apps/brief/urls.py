from django.urls import path

from .views import BriefHistoryView, LatestBriefView

app_name = "brief"

urlpatterns = [
    path(
        "<int:business_id>/latest/",
        LatestBriefView.as_view(),
        name="brief-latest",
    ),
    path(
        "<int:business_id>/history/",
        BriefHistoryView.as_view(),
        name="brief-history",
    ),
]
