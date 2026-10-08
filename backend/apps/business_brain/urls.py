from django.urls import path
app_name = "business-brain"

from .views import (
    BusinessAudienceView,
    BusinessBrandView,
    BusinessGoalView,
    BusinessPolicyView,
    BusinessProfileView,
)

from .views import BusinessProfileView


urlpatterns = [
    path(
        "<int:business_id>/profile/",
        BusinessProfileView.as_view(),
        name="business-profile",
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
]