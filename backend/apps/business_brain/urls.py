from django.urls import path

from .views import (
    BusinessAudienceView,
    BusinessBrainDraftView,
    BusinessBrainProgressView,
    BusinessBrandView,
    BusinessGoalView,
    BusinessMarketBriefView,
    BusinessMarketDecisionView,
    BusinessMarketResearchView,
    BusinessPolicyView,
    BusinessProfileView,
    BusinessProfileWebsiteScanView,
)

app_name = "business-brain"

urlpatterns = [
    path(
        "<int:business_id>/progress/",
        BusinessBrainProgressView.as_view(),
        name="business-brain-progress",
    ),
    path(
        "<int:business_id>/draft/",
        BusinessBrainDraftView.as_view(),
        name="business-brain-draft",
    ),
    path(
        "<int:business_id>/profile/",
        BusinessProfileView.as_view(),
        name="business-profile",
    ),
    path(
        "<int:business_id>/profile/scan-website/",
        BusinessProfileWebsiteScanView.as_view(),
        name="business-profile-scan-website",
    ),
    path(
        "<int:business_id>/audience/",
        BusinessAudienceView.as_view(),
        name="business-audience",
    ),
    path(
        "<int:business_id>/brand/",
        BusinessBrandView.as_view(),
        name="business-brand",
    ),
    path(
        "<int:business_id>/goals/",
        BusinessGoalView.as_view(),
        name="business-goals",
    ),
    path(
        "<int:business_id>/policy/",
        BusinessPolicyView.as_view(),
        name="business-policy",
    ),
    path(
        "<int:business_id>/market/",
        BusinessMarketBriefView.as_view(),
        name="business-market",
    ),
    path(
        "<int:business_id>/market/research/",
        BusinessMarketResearchView.as_view(),
        name="business-market-research",
    ),
    path(
        "<int:business_id>/market/decision/",
        BusinessMarketDecisionView.as_view(),
        name="business-market-decision",
    ),
]
