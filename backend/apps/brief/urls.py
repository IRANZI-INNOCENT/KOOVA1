from django.urls import path

from .views import (
    BriefHistoryView,
    LatestBriefView,
    LatestWeeklyReportView,
    WeeklyReportHistoryView,
)

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
    path(
        "<int:business_id>/weekly/latest/",
        LatestWeeklyReportView.as_view(),
        name="weekly-latest",
    ),
    path(
        "<int:business_id>/weekly/history/",
        WeeklyReportHistoryView.as_view(),
        name="weekly-history",
    ),
]
