"""
URL routes for the Kova Agent API.
"""

from django.urls import path

from .views import KovaAgentView, KovaStartersView


app_name = "kova-ai"


urlpatterns = [
    path(
        "agent/",
        KovaAgentView.as_view(),
        name="agent",
    ),
    path(
        "starters/",
        KovaStartersView.as_view(),
        name="starters",
    ),
]