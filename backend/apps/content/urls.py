from django.urls import path

from .views import (
    ConnectedChannelsView,
    ContentApproveView,
    ContentBatchListView,
    ContentCampaignView,
    ContentDetailView,
    ContentScheduleView,
    ContentDraftView,
    ContentListView,
    ContentPublishView,
    ContentRejectView,
    ProductContentStatusView,
)

app_name = "content"

urlpatterns = [
    path(
        "<int:business_id>/channels/",
        ConnectedChannelsView.as_view(),
        name="connected-channels",
    ),
    path(
        "<int:business_id>/campaign/",
        ContentCampaignView.as_view(),
        name="content-campaign",
    ),
    path(
        "<int:business_id>/schedule/",
        ContentScheduleView.as_view(),
        name="content-schedule",
    ),
    path(
        "<int:business_id>/product-status/",
        ProductContentStatusView.as_view(),
        name="content-product-status",
    ),
    path(
        "<int:business_id>/batches/",
        ContentBatchListView.as_view(),
        name="content-batches",
    ),
    path(
        "<int:business_id>/draft/",
        ContentDraftView.as_view(),
        name="content-draft",
    ),
    path(
        "<int:business_id>/",
        ContentListView.as_view(),
        name="content-list",
    ),
    path(
        "<int:business_id>/<int:pk>/",
        ContentDetailView.as_view(),
        name="content-detail",
    ),
    path(
        "<int:business_id>/<int:pk>/approve/",
        ContentApproveView.as_view(),
        name="content-approve",
    ),
    path(
        "<int:business_id>/<int:pk>/publish/",
        ContentPublishView.as_view(),
        name="content-publish",
    ),
    path(
        "<int:business_id>/<int:pk>/reject/",
        ContentRejectView.as_view(),
        name="content-reject",
    ),
]
